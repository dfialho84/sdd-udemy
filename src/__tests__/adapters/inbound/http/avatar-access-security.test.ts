// Teste de segurança ST-6 — Acesso não autenticado e acesso a conta bloqueada ao endpoint de avatar
// Rastreabilidade: NFR-13 · REQ-2 · T-77
//
// Vetores de ataque simulados:
// - Acesso direto sem autenticação (vazamento de fotos de perfil)
// - Acesso com sessão válida a avatar de conta banida/pendente via token de sessão ainda válido
//
// Cobre:
// (a) sem token de sessão → HTTP 401; log JSON com campos obrigatórios; nenhum campo sensível exposto
// (b) sessão válida + proprietário pending → HTTP 403; log JSON correto; sem presigned URL gerada
// (c) sessão válida + proprietário active → HTTP 302 Redirect; nenhum log de rejeição emitido

import { NextRequest } from "next/server";
import { GET } from "@/app/api/users/[userId]/avatar/route";
import {
  setAvatarAccessDepsFactory,
  resetAvatarAccessDepsFactory,
  type AvatarAccessHandlerDeps,
} from "@/app/api/users/[userId]/avatar/deps";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { AvatarAccessPort } from "@/domain/ports/avatar-access.port";
import { User } from "@/domain/entities/user";

// --- Mock do módulo @/lib/auth ---
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));
import { auth } from "@/lib/auth";
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// --- Helpers ---

function makeUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: "target-owner-id",
    name: "Proprietário Alvo",
    username: "proprietario_alvo",
    email: "alvo@example.com",
    passwordHash: "$argon2id$hash",
    birthDate: new Date("1990-01-01"),
    avatarKey: "avatars/uuid-st6.jpg",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeRequest(userId: string = "target-owner-id"): NextRequest {
  return new NextRequest(`http://localhost/api/users/${userId}/avatar`, { method: "GET" });
}

function makeParams(userId: string = "target-owner-id"): { params: Promise<{ userId: string }> } {
  return { params: Promise.resolve({ userId }) };
}

const mockPresignedUrl = "https://minio.example.com/avatars/uuid-st6.jpg?sig=xyz789";

function makeDeps(): AvatarAccessHandlerDeps {
  const userRepository: jest.Mocked<UserRepository> = {
    create: jest.fn(),
    findByUsername: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn().mockResolvedValue(makeUser()),
    delete: jest.fn(),
    activate: jest.fn(),
  };
  const avatarAccessPort: jest.Mocked<AvatarAccessPort> = {
    getPresignedUrl: jest.fn().mockResolvedValue(mockPresignedUrl),
  };
  const logger = { info: jest.fn(), error: jest.fn() };
  return { userRepository, avatarAccessPort, logger };
}

const validSession = {
  user: { id: "attacker-session-user-id", name: "Atacante", email: "atacante@example.com" },
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
};

describe("ST-6: Acesso não autenticado e a conta bloqueada ao endpoint de avatar", () => {
  let deps: AvatarAccessHandlerDeps;

  beforeEach(() => {
    jest.clearAllMocks();
    deps = makeDeps();
    setAvatarAccessDepsFactory(() => deps);
  });

  afterEach(() => {
    resetAvatarAccessDepsFactory();
  });

  // ST-6a: Acesso direto sem token de sessão — vetor: vazamento de fotos sem autenticação
  it("(a) sem token de sessão → HTTP 401; log JSON com campos obrigatórios; nenhum campo sensível exposto", async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(401);
    const body = await response.json();

    // Campos da estrutura padronizada de erro devem estar presentes
    expect(body.codigo).toBe(401);
    expect(body.mensagem).toBeDefined();
    expect(body.requestId).toBeDefined();
    expect(body.timestamp).toBeDefined();

    // Nenhum campo sensível deve ser exposto (sem presigned URL, sem avatar_key)
    expect(JSON.stringify(body)).not.toContain("presigned");
    expect(JSON.stringify(body)).not.toContain("avatars/");
    expect(JSON.stringify(body)).not.toContain("minio");

    // Log JSON de rejeição deve conter campos obrigatórios do NFR-13
    expect((deps.logger as { info: jest.Mock }).info).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        userId: null,
        ownerUserId: "target-owner-id",
        tipoRejeicao: 401,
        requestId: expect.any(String),
      }),
      expect.any(String),
    );

    // AvatarAccessPort não deve ter sido chamado — nenhuma presigned URL gerada
    expect((deps.avatarAccessPort as jest.Mocked<AvatarAccessPort>).getPresignedUrl).not.toHaveBeenCalled();
  });

  // ST-6b: Sessão válida mas conta do proprietário está pending — vetor: token de sessão ainda ativo após banimento
  it("(b) sessão válida + proprietário pending → HTTP 403; log JSON correto; sem presigned URL", async () => {
    mockAuth.mockResolvedValue(validSession as never);
    (deps.userRepository as jest.Mocked<UserRepository>).findById.mockResolvedValue(
      makeUser({ status: "pending" }),
    );

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.codigo).toBe(403);

    // Nenhum campo sensível exposto
    expect(JSON.stringify(body)).not.toContain("presigned");
    expect(JSON.stringify(body)).not.toContain("avatars/");

    // Log JSON de rejeição com campos obrigatórios
    expect((deps.logger as { info: jest.Mock }).info).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        userId: "attacker-session-user-id",
        ownerUserId: "target-owner-id",
        tipoRejeicao: 403,
        requestId: expect.any(String),
      }),
      expect.any(String),
    );

    // Sem presigned URL gerada
    expect((deps.avatarAccessPort as jest.Mocked<AvatarAccessPort>).getPresignedUrl).not.toHaveBeenCalled();
  });

  // ST-6c (d): Sessão válida + proprietário active → HTTP 302; nenhum log de rejeição
  it("(d) sessão válida + proprietário active → HTTP 302 Redirect; nenhum log de rejeição emitido", async () => {
    mockAuth.mockResolvedValue(validSession as never);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toBe(mockPresignedUrl);

    // Nenhum log de rejeição deve ter sido emitido
    expect((deps.logger as { info: jest.Mock }).info).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipoRejeicao: expect.anything() }),
      expect.anything(),
    );
  });
});

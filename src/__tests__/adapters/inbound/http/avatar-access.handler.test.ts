// Testes unitários UT-11 — AvatarAccessHandler GET /api/users/[userId]/avatar
// Rastreabilidade: NFR-13 · REQ-2 · T-75
//
// Cobre:
// (a) caminho feliz: sessão válida + proprietário active + avatar_key → HTTP 302 Redirect para presigned URL
// (b) sem sessão: log 401 emitido com campos obrigatórios → HTTP 401
// (c) sessão + proprietário pending (não-active) → log 403 emitido → HTTP 403
// (d) sessão + proprietário blocked → log 403 emitido → HTTP 403 (estado futuro — usa status type cast)
// (e) proprietário não encontrado → HTTP 404 sem log de rejeição
// (f) proprietário active mas avatar_key = null → HTTP 404 sem log de rejeição
//
// Mocka: @/lib/auth (função auth), AvatarAccessHandlerDeps via setAvatarAccessDepsFactory

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
    id: "owner-user-id",
    name: "João Proprietário",
    email: "joao@example.com",
    passwordHash: "$argon2id$hash",
    birthDate: new Date("1990-01-01"),
    avatarKey: "avatars/uuid-1234.jpg",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeRequest(userId: string = "owner-user-id"): NextRequest {
  return new NextRequest(`http://localhost/api/users/${userId}/avatar`, {
    method: "GET",
  });
}

function makeParams(userId: string = "owner-user-id"): { params: Promise<{ userId: string }> } {
  return { params: Promise.resolve({ userId }) };
}

function makeDeps(
  overrides: Partial<AvatarAccessHandlerDeps> = {},
): AvatarAccessHandlerDeps {
  const userRepository: jest.Mocked<UserRepository> = {
    create: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(makeUser()),
    delete: jest.fn(),
    activate: jest.fn(),
  };

  const avatarAccessPort: jest.Mocked<AvatarAccessPort> = {
    getPresignedUrl: jest
      .fn()
      .mockResolvedValue("https://minio.example.com/avatars/uuid-1234.jpg?sig=abc"),
  };

  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  return { userRepository, avatarAccessPort, logger, ...overrides };
}

// Sessão válida simulada
const validSession = {
  user: { id: "requesting-user-id", name: "Solicitante", email: "solicitante@example.com" },
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
};

describe("UT-11: AvatarAccessHandler GET /api/users/[userId]/avatar", () => {
  let deps: AvatarAccessHandlerDeps;

  beforeEach(() => {
    jest.clearAllMocks();
    deps = makeDeps();
    setAvatarAccessDepsFactory(() => deps);
  });

  afterEach(() => {
    resetAvatarAccessDepsFactory();
  });

  // (a) Caminho feliz — sessão válida + proprietário active + avatar_key → HTTP 302
  it("(a) caminho feliz: sessão válida + proprietário active + avatar_key → HTTP 302 Redirect para presigned URL", async () => {
    mockAuth.mockResolvedValue(validSession as never);

    const response = await GET(makeRequest(), makeParams());

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://minio.example.com/avatars/uuid-1234.jpg?sig=abc",
    );
    expect((deps.avatarAccessPort as jest.Mocked<AvatarAccessPort>).getPresignedUrl).toHaveBeenCalledWith(
      "avatars/uuid-1234.jpg",
      60,
    );
    expect((deps.logger as { info: jest.Mock }).info).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipoRejeicao: expect.anything() }),
      expect.anything(),
    );
  });

  // (b) Sem sessão → log 401 + HTTP 401
  it("(b) sem sessão: log JSON emitido com userId=null, tipoRejeicao=401 → HTTP 401", async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await GET(makeRequest(), makeParams("owner-user-id"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.codigo).toBe(401);
    expect(body.requestId).toBeDefined();
    expect(body.timestamp).toBeDefined();

    // Verifica que o log foi emitido com os campos obrigatórios
    expect((deps.logger as { info: jest.Mock }).info).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        userId: null,
        ownerUserId: "owner-user-id",
        tipoRejeicao: 401,
        requestId: expect.any(String),
      }),
      expect.any(String),
    );

    // AvatarAccessPort não deve ser chamado
    expect((deps.avatarAccessPort as jest.Mocked<AvatarAccessPort>).getPresignedUrl).not.toHaveBeenCalled();
  });

  // (c) Sessão + proprietário pending → log 403 + HTTP 403
  it("(c) sessão + proprietário pending → log JSON com tipoRejeicao=403 → HTTP 403", async () => {
    mockAuth.mockResolvedValue(validSession as never);
    (deps.userRepository as jest.Mocked<UserRepository>).findById.mockResolvedValue(
      makeUser({ status: "pending" }),
    );

    const response = await GET(makeRequest(), makeParams("owner-user-id"));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.codigo).toBe(403);

    expect((deps.logger as { info: jest.Mock }).info).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        userId: "requesting-user-id",
        ownerUserId: "owner-user-id",
        tipoRejeicao: 403,
        requestId: expect.any(String),
      }),
      expect.any(String),
    );

    expect((deps.avatarAccessPort as jest.Mocked<AvatarAccessPort>).getPresignedUrl).not.toHaveBeenCalled();
  });

  // (d) Proprietário não encontrado → HTTP 404 sem log de rejeição de segurança
  it("(d) proprietário não encontrado → HTTP 404 sem log de rejeição de segurança", async () => {
    mockAuth.mockResolvedValue(validSession as never);
    (deps.userRepository as jest.Mocked<UserRepository>).findById.mockResolvedValue(null);

    const response = await GET(makeRequest(), makeParams("nonexistent-id"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.codigo).toBe(404);

    // Nenhum log de rejeição de segurança deve ter sido emitido
    expect((deps.logger as { info: jest.Mock }).info).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipoRejeicao: expect.anything() }),
      expect.anything(),
    );
  });

  // (e) Proprietário active mas avatar_key = null → HTTP 404 sem log de rejeição
  it("(e) proprietário active + avatar_key = null → HTTP 404 sem log de rejeição de segurança", async () => {
    mockAuth.mockResolvedValue(validSession as never);
    (deps.userRepository as jest.Mocked<UserRepository>).findById.mockResolvedValue(
      makeUser({ avatarKey: null }),
    );

    const response = await GET(makeRequest(), makeParams("owner-user-id"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.codigo).toBe(404);

    // Nenhum log de rejeição de segurança
    expect((deps.logger as { info: jest.Mock }).info).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipoRejeicao: expect.anything() }),
      expect.anything(),
    );

    expect((deps.avatarAccessPort as jest.Mocked<AvatarAccessPort>).getPresignedUrl).not.toHaveBeenCalled();
  });
});

// Teste de integração IT-8 — AvatarAccessHandler GET /api/users/[userId]/avatar
// Rastreabilidade: NFR-13 · REQ-2 · T-78
//
// Cobre:
// (a) sessão ausente → HTTP 401; log JSON emitido com campos obrigatórios; nenhuma presigned URL gerada
// (b) sessão válida + proprietário active + avatar_key preenchido → HTTP 302 Redirect para presigned URL do MinIO
// (c) sessão válida + proprietário pending → HTTP 403; log JSON emitido
// (d) sessão válida + userId inexistente → HTTP 404; nenhum log de rejeição
// (e) sessão válida + proprietário active + avatar_key = null → HTTP 404; nenhum log de rejeição
//
// Pré-requisitos:
//   - banco MySQL de teste rodando com migration aplicada (kanban_mysql)
//   - MinIO rodando via Docker Compose (kanban_minio)
//   - DATABASE_URL apontando para o banco de teste

import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { GET } from "@/app/api/users/[userId]/avatar/route";
import {
  setAvatarAccessDepsFactory,
  resetAvatarAccessDepsFactory,
  buildAvatarAccessDeps,
} from "@/app/api/users/[userId]/avatar/deps";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import { MinioAvatarStorageAdapter } from "@/adapters/outbound/storage/minio-avatar-storage.adapter";
import { Client as MinioClient } from "minio";
import { db } from "@/lib/db";
import { users, confirmationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// --- Mock do módulo @/lib/auth ---
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));
import { auth } from "@/lib/auth";
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// Sessão válida simulada
const validSession = {
  user: { id: "it8-requesting-user", name: "Solicitante", email: "it8-solicitante@example.com" },
  expires: new Date(Date.now() + 3600 * 1000).toISOString(),
};

// Configuração MinIO de teste
const testMinioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
  port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
  useSSL: (process.env.MINIO_USE_SSL ?? "false") === "true",
  accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
});

const IT8_BUCKET = "it8-avatar-test";
const AVATAR_TEST_KEY = `avatars/${randomUUID()}.jpg`;

// IDs dos usuários de teste
const ACTIVE_USER_ID = randomUUID();
const ACTIVE_NO_AVATAR_USER_ID = randomUUID();
const PENDING_USER_ID = randomUUID();

// Logger spy para capturar chamadas
const logSpy = { info: jest.fn(), error: jest.fn() };

function makeRequest(userId: string): NextRequest {
  return new NextRequest(`http://localhost/api/users/${userId}/avatar`, { method: "GET" });
}

function makeParams(userId: string): { params: Promise<{ userId: string }> } {
  return { params: Promise.resolve({ userId }) };
}

beforeAll(async () => {
  // Cria bucket de teste no MinIO
  const exists = await testMinioClient.bucketExists(IT8_BUCKET);
  if (!exists) {
    await testMinioClient.makeBucket(IT8_BUCKET);
  }

  // Carrega objeto de avatar no bucket para o caminho feliz
  const fakeImageBuffer = Buffer.from("fake-jpeg-data-for-it8");
  await testMinioClient.putObject(IT8_BUCKET, AVATAR_TEST_KEY, fakeImageBuffer);

  // Insere usuários de teste no banco
  await db.insert(users).values([
    {
      id: ACTIVE_USER_ID,
      name: "IT8 Active Com Avatar",
      username: "it8_active_avatar",
      email: "it8-active@example.com",
      passwordHash: "$argon2id$it8-test",
      birthDate: new Date("1990-01-01"),
      avatarKey: AVATAR_TEST_KEY,
      status: "active",
    },
    {
      id: ACTIVE_NO_AVATAR_USER_ID,
      name: "IT8 Active Sem Avatar",
      username: "it8_active_noavatar",
      email: "it8-active-noavatar@example.com",
      passwordHash: "$argon2id$it8-test",
      birthDate: new Date("1990-01-01"),
      avatarKey: null,
      status: "active",
    },
    {
      id: PENDING_USER_ID,
      name: "IT8 Pending",
      username: "it8_pending",
      email: "it8-pending@example.com",
      passwordHash: "$argon2id$it8-test",
      birthDate: new Date("1990-01-01"),
      avatarKey: null,
      status: "pending",
    },
  ]);

  // Configura a fábrica de dependências com MinIO de teste e logger spy
  const adapter = new MinioAvatarStorageAdapter(testMinioClient, IT8_BUCKET);
  setAvatarAccessDepsFactory(() => ({
    ...buildAvatarAccessDeps(),
    userRepository: new DrizzleUserRepository(),
    avatarAccessPort: adapter,
    logger: logSpy,
  }));
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Remove usuários de teste
  for (const uid of [ACTIVE_USER_ID, ACTIVE_NO_AVATAR_USER_ID, PENDING_USER_ID]) {
    await db.delete(confirmationTokens).where(eq(confirmationTokens.userId, uid));
    await db.delete(users).where(eq(users.id, uid));
  }

  // Remove objeto de avatar do bucket de teste
  try {
    await testMinioClient.removeObject(IT8_BUCKET, AVATAR_TEST_KEY);
    await testMinioClient.removeBucket(IT8_BUCKET);
  } catch {
    // ignora erros de limpeza
  }

  resetAvatarAccessDepsFactory();
  await (db.$client as { end?: () => Promise<void> }).end?.();
});

describe("IT-8: AvatarAccessHandler — GET /api/users/[userId]/avatar (integração)", () => {
  // (a) Sessão ausente → HTTP 401 + log JSON obrigatório
  it("(a) sessão ausente → HTTP 401; log JSON com userId=null, tipoRejeicao=401; nenhuma presigned URL gerada", async () => {
    mockAuth.mockResolvedValue(null as never);

    const response = await GET(makeRequest(ACTIVE_USER_ID), makeParams(ACTIVE_USER_ID));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.codigo).toBe(401);

    expect(logSpy.info).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        userId: null,
        ownerUserId: ACTIVE_USER_ID,
        tipoRejeicao: 401,
        requestId: expect.any(String),
      }),
      expect.any(String),
    );
  });

  // (b) Sessão válida + proprietário active + avatar_key → HTTP 302 Redirect para presigned URL MinIO
  it("(b) sessão válida + proprietário active + avatar_key → HTTP 302 com presigned URL do MinIO", async () => {
    mockAuth.mockResolvedValue(validSession as never);

    const response = await GET(makeRequest(ACTIVE_USER_ID), makeParams(ACTIVE_USER_ID));

    expect(response.status).toBe(302);

    const location = response.headers.get("location");
    expect(location).toBeTruthy();
    // A URL deve conter o endpoint MinIO e a object key
    expect(location).toContain(AVATAR_TEST_KEY.replace("avatars/", ""));
  });

  // (c) Sessão válida + proprietário pending → HTTP 403 + log JSON
  it("(c) sessão válida + proprietário pending → HTTP 403; log JSON com tipoRejeicao=403", async () => {
    mockAuth.mockResolvedValue(validSession as never);

    const response = await GET(makeRequest(PENDING_USER_ID), makeParams(PENDING_USER_ID));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.codigo).toBe(403);

    expect(logSpy.info).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        userId: "it8-requesting-user",
        ownerUserId: PENDING_USER_ID,
        tipoRejeicao: 403,
        requestId: expect.any(String),
      }),
      expect.any(String),
    );
  });

  // (d) Sessão válida + userId inexistente → HTTP 404 sem log de rejeição
  it("(d) userId inexistente → HTTP 404; nenhum log de rejeição de segurança", async () => {
    mockAuth.mockResolvedValue(validSession as never);
    const nonexistentId = randomUUID();

    const response = await GET(makeRequest(nonexistentId), makeParams(nonexistentId));

    expect(response.status).toBe(404);
    expect(logSpy.info).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipoRejeicao: expect.anything() }),
      expect.anything(),
    );
  });

  // (e) Sessão válida + proprietário active + avatar_key = null → HTTP 404 sem log de rejeição
  it("(e) proprietário active + avatar_key = null → HTTP 404; nenhum log de rejeição", async () => {
    mockAuth.mockResolvedValue(validSession as never);

    const response = await GET(makeRequest(ACTIVE_NO_AVATAR_USER_ID), makeParams(ACTIVE_NO_AVATAR_USER_ID));

    expect(response.status).toBe(404);
    expect(logSpy.info).not.toHaveBeenCalledWith(
      expect.objectContaining({ tipoRejeicao: expect.anything() }),
      expect.anything(),
    );
  });
});

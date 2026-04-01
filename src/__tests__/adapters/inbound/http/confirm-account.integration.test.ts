// Teste de integração IT-6 — ConfirmAccountHandler GET /api/auth/confirm
// Testa o endpoint completo com banco MySQL real.
// Rastreabilidade: T-43 · IT-6 · REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15
//
// Pré-requisitos:
//   - banco MySQL de teste rodando com migration aplicada (kanban_mysql)
//   - DATABASE_URL apontando para o banco de teste

import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/confirm/route";
import { setDepsFactory, resetDepsFactory } from "@/app/api/auth/confirm/deps";
import { db } from "@/lib/db";
import { users, confirmationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DrizzleConfirmationTokenRepository } from "@/adapters/outbound/persistence/drizzle-confirmation-token-repository";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import type { ConfirmAccountUseCaseDeps } from "@/application/use-cases/confirm-account.use-case";

// Helper para construir requests GET com query string
function makeRequest(token?: string): NextRequest {
  const url =
    token !== undefined && token !== ""
      ? `http://localhost/api/auth/confirm?token=${encodeURIComponent(token)}`
      : "http://localhost/api/auth/confirm";
  return new NextRequest(url, { method: "GET" });
}

// Helper para inserir um usuário de teste diretamente no banco
async function insertTestUser(
  id: string,
  email: string,
  status: "pending" | "active" = "pending",
) {
  await db.insert(users).values({
    id,
    name: "IT6 Teste",
    email,
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
    birthDate: new Date("1990-01-01"),
    status,
  });
}

// Helper para inserir um token de confirmação diretamente no banco
async function insertTestToken(
  tokenId: string,
  userId: string,
  tokenValue: string,
  options?: { expiresAt?: Date; usedAt?: Date | null },
) {
  const expiresAt =
    options?.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h padrão
  await db.insert(confirmationTokens).values({
    id: tokenId,
    userId,
    token: tokenValue,
    expiresAt,
    usedAt: options?.usedAt ?? null,
  });
}

// Remove todos os registros de teste desta suíte (prefixo it6-)
async function cleanupIT6() {
  const allUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users);

  const it6Users = allUsers.filter((u) => u.email.startsWith("it6-"));

  for (const user of it6Users) {
    await db
      .delete(confirmationTokens)
      .where(eq(confirmationTokens.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
}

// Fábrica de dependências concretas para integração
function buildConfirmDeps(): ConfirmAccountUseCaseDeps {
  return {
    confirmationTokenRepository: new DrizzleConfirmationTokenRepository(),
    userRepository: new DrizzleUserRepository(),
    appBaseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000",
    logger: {
      info: () => {},
      error: () => {},
    },
  };
}

describe("IT-6: ConfirmAccountHandler — GET /api/auth/confirm (integração)", () => {
  beforeAll(() => {
    setDepsFactory(buildConfirmDeps);
  });

  beforeEach(async () => {
    await cleanupIT6();
  });

  afterAll(async () => {
    await cleanupIT6();
    resetDepsFactory();
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  // -----------------------------------------------------------------------
  // HTTP 200 — token válido (REQ-10 · REQ-11)
  // -----------------------------------------------------------------------
  describe("HTTP 200 — token válido (REQ-10 · REQ-11)", () => {
    it("retorna 200 com message e loginUrl", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";

      await insertTestUser(userId, "it6-valid-200@example.com");
      await insertTestToken(tokenId, userId, tokenValue);

      const response = await GET(makeRequest(tokenValue));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toBeDefined();
      expect(typeof json.message).toBe("string");
      expect(json.loginUrl).toBeDefined();
      expect(typeof json.loginUrl).toBe("string");
    });

    it("atualiza o status do usuário para 'active' no banco", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";

      await insertTestUser(userId, "it6-valid-active@example.com");
      await insertTestToken(tokenId, userId, tokenValue);

      await GET(makeRequest(tokenValue));

      const rows = await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, userId));

      expect(rows[0]?.status).toBe("active");
    });

    it("preenche used_at no token após confirmação bem-sucedida", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6";

      await insertTestUser(userId, "it6-valid-usedat@example.com");
      await insertTestToken(tokenId, userId, tokenValue);

      await GET(makeRequest(tokenValue));

      const tokenRows = await db
        .select({ usedAt: confirmationTokens.usedAt })
        .from(confirmationTokens)
        .where(eq(confirmationTokens.id, tokenId));

      expect(tokenRows[0]?.usedAt).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — token ausente na query string (REQ-10)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — token ausente na query string", () => {
    it("retorna 400 quando token não está presente na query string", async () => {
      const response = await GET(makeRequest());

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBeDefined();
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 404 — token inexistente (REQ-10)
  // -----------------------------------------------------------------------
  describe("HTTP 404 — token inexistente no banco", () => {
    it("retorna 404 quando token não existe no banco", async () => {
      const response = await GET(
        makeRequest("00000000000000000000000000000000"),
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.codigo).toBe(404);
      expect(json.mensagem).toBeDefined();
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 409 — token já utilizado (REQ-14 · REQ-15)
  // -----------------------------------------------------------------------
  describe("HTTP 409 — token já utilizado (REQ-14 · REQ-15)", () => {
    it("retorna 409 quando token já tem used_at preenchido", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1";

      await insertTestUser(userId, "it6-used-409@example.com", "active");
      await insertTestToken(tokenId, userId, tokenValue, {
        usedAt: new Date(),
      });

      const response = await GET(makeRequest(tokenValue));

      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.codigo).toBe(409);
      expect(json.mensagem).toBeDefined();
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("não altera o status do usuário quando token já foi utilizado", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

      await insertTestUser(userId, "it6-used-status@example.com", "active");
      await insertTestToken(tokenId, userId, tokenValue, {
        usedAt: new Date(),
      });

      await GET(makeRequest(tokenValue));

      const rows = await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, userId));

      expect(rows[0]?.status).toBe("active");
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 410 — token expirado (REQ-12 · REQ-13)
  // -----------------------------------------------------------------------
  describe("HTTP 410 — token expirado (REQ-12 · REQ-13)", () => {
    it("retorna 410 quando token está expirado", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3";
      const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // -25h

      await insertTestUser(userId, "it6-expired-410@example.com");
      await insertTestToken(tokenId, userId, tokenValue, { expiresAt: past });

      const response = await GET(makeRequest(tokenValue));

      expect(response.status).toBe(410);
      const json = await response.json();
      expect(json.codigo).toBe(410);
      expect(json.mensagem).toBeDefined();
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("remove o cadastro pendente do banco quando token está expirado", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d5";
      const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // -25h

      await insertTestUser(userId, "it6-expired-delete@example.com");
      await insertTestToken(tokenId, userId, tokenValue, { expiresAt: past });

      await GET(makeRequest(tokenValue));

      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId));

      expect(rows).toHaveLength(0);
    });
  });
});

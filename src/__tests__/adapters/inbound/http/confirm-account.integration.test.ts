// Teste de integração IT-7 — ConfirmAccountHandler GET /api/auth/confirm
// Testa o endpoint completo com banco MySQL real.
// Rastreabilidade: T-43 · IT-7 · REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15
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
    name: "IT7 Teste",
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

// Remove todos os registros de teste desta suíte (prefixo it7-)
async function cleanupIT7() {
  const allUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users);

  const it7Users = allUsers.filter((u) => u.email.startsWith("it7-"));

  for (const user of it7Users) {
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

describe("IT-7: ConfirmAccountHandler — GET /api/auth/confirm (integração)", () => {
  beforeAll(() => {
    setDepsFactory(buildConfirmDeps);
  });

  beforeEach(async () => {
    await cleanupIT7();
  });

  afterAll(async () => {
    await cleanupIT7();
    resetDepsFactory();
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  // -----------------------------------------------------------------------
  // HTTP 302 — token válido → /confirm?status=success (REQ-10 · REQ-11)
  // -----------------------------------------------------------------------
  describe("HTTP 302 — token válido (REQ-10 · REQ-11)", () => {
    it("retorna 302 Redirect para /confirm?status=success com token válido", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";

      await insertTestUser(userId, "it7-valid-302@example.com");
      await insertTestToken(tokenId, userId, tokenValue);

      const response = await GET(makeRequest(tokenValue));

      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/confirm");
      expect(location).toContain("status=success");
    });

    it("atualiza o status do usuário para 'active' no banco", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5";

      await insertTestUser(userId, "it7-valid-active@example.com");
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

      await insertTestUser(userId, "it7-valid-usedat@example.com");
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
  // HTTP 302 — token ausente → /confirm?error=invalid_token
  // -----------------------------------------------------------------------
  describe("HTTP 302 — token ausente na query string", () => {
    it("retorna 302 Redirect para /confirm?error=invalid_token quando token não está presente", async () => {
      const response = await GET(makeRequest());

      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/confirm");
      expect(location).toMatch(/error=/);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 302 — token inexistente → /confirm?error=not_found
  // -----------------------------------------------------------------------
  describe("HTTP 302 — token inexistente no banco", () => {
    it("retorna 302 Redirect quando token não existe no banco", async () => {
      const response = await GET(
        makeRequest("00000000000000000000000000000000"),
      );

      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/confirm");
      expect(location).toMatch(/error=/);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 302 — token já utilizado → /confirm?error=already_confirmed (REQ-14 · REQ-15)
  // -----------------------------------------------------------------------
  describe("HTTP 302 — token já utilizado (REQ-14 · REQ-15)", () => {
    it("retorna 302 Redirect para /confirm?error=already_confirmed quando token já tem used_at preenchido", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1";

      await insertTestUser(userId, "it7-used-409@example.com", "active");
      await insertTestToken(tokenId, userId, tokenValue, {
        usedAt: new Date(),
      });

      const response = await GET(makeRequest(tokenValue));

      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/confirm");
      expect(location).toContain("error=already_confirmed");
    });

    it("não altera o status do usuário quando token já foi utilizado", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

      await insertTestUser(userId, "it7-used-status@example.com", "active");
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
  // HTTP 302 — token expirado → /confirm?error=expired (REQ-12 · REQ-13)
  // -----------------------------------------------------------------------
  describe("HTTP 302 — token expirado (REQ-12 · REQ-13)", () => {
    it("retorna 302 Redirect para /confirm?error=expired quando token está expirado", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3";
      const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // -25h

      await insertTestUser(userId, "it7-expired-410@example.com");
      await insertTestToken(tokenId, userId, tokenValue, { expiresAt: past });

      const response = await GET(makeRequest(tokenValue));

      expect(response.status).toBe(302);
      const location = response.headers.get("location");
      expect(location).toContain("/confirm");
      expect(location).toContain("error=expired");
    });

    it("remove o cadastro pendente do banco quando token está expirado", async () => {
      const userId = crypto.randomUUID();
      const tokenId = crypto.randomUUID();
      const tokenValue = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d5";
      const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // -25h

      await insertTestUser(userId, "it7-expired-delete@example.com");
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

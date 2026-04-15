// Teste de segurança ST-2 — Prevenção de reuso de token de confirmação
// Verifica que token de confirmação é invalidado após primeiro uso e rejeitado em replay.
// Rastreabilidade: T-48 · ST-2 · NFR-3 · REQ-14 · REQ-15
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
function makeRequest(token: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/auth/confirm?token=${encodeURIComponent(token)}`,
    { method: "GET" },
  );
}

// Helper para inserir usuario pendente de teste
async function insertTestUser(id: string, email: string): Promise<void> {
  await db.insert(users).values({
    id,
    name: "ST2 Teste",
    username: `st2-user-${id}`,
    email,
    passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
    birthDate: new Date("1990-01-01"),
    status: "pending",
  });
}

// Helper para inserir token valido (expira em +24h, nao utilizado)
async function insertValidToken(
  tokenId: string,
  userId: string,
  tokenValue: string,
): Promise<void> {
  await db.insert(confirmationTokens).values({
    id: tokenId,
    userId,
    token: tokenValue,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    usedAt: null,
  });
}

// Remove todos os registros de teste desta suite (prefixo st2-)
async function cleanupST2(): Promise<void> {
  const allUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users);

  const st2Users = allUsers.filter((u) => u.email.startsWith("st2-"));

  for (const user of st2Users) {
    await db
      .delete(confirmationTokens)
      .where(eq(confirmationTokens.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));
  }
}

// Fabrica de dependencias concretas para integracao
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

describe("ST-2: Prevenção de reuso de token de confirmação (segurança)", () => {
  beforeAll(() => {
    setDepsFactory(buildConfirmDeps);
  });

  beforeEach(async () => {
    await cleanupST2();
  });

  afterAll(async () => {
    await cleanupST2();
    resetDepsFactory();
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  // -----------------------------------------------------------------------
  // ST-2a — Primeiro uso do token: HTTP 302 → /confirm?status=success, used_at preenchido
  // -----------------------------------------------------------------------
  it("ST-2a: primeiro uso do token retorna HTTP 302 Redirect para /confirm?status=success e preenche used_at no banco", async () => {
    const userId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const tokenValue = "st2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    await insertTestUser(userId, "st2-first-use@example.com");
    await insertValidToken(tokenId, userId, tokenValue);

    const response = await GET(makeRequest(tokenValue));

    // Verifica HTTP 302 Redirect para /confirm?status=success
    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toContain("/confirm");
    expect(location).toContain("status=success");

    // Verifica que used_at foi preenchido no banco (token invalidado)
    const tokenRows = await db
      .select({ usedAt: confirmationTokens.usedAt })
      .from(confirmationTokens)
      .where(eq(confirmationTokens.id, tokenId));

    expect(tokenRows[0]?.usedAt).not.toBeNull();
  });

  // -----------------------------------------------------------------------
  // ST-2b — Segundo uso (replay): HTTP 302 → /confirm?error=already_confirmed
  //          status não alterado, nenhum dado sensível exposto
  // -----------------------------------------------------------------------
  it("ST-2b: segundo uso do mesmo token retorna HTTP 302 para /confirm?error=already_confirmed e nao altera status da conta", async () => {
    const userId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const tokenValue = "st2bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb".slice(0, 32);

    await insertTestUser(userId, "st2-replay-attack@example.com");
    await insertValidToken(tokenId, userId, tokenValue);

    // Primeiro uso — ativa a conta
    const firstResponse = await GET(makeRequest(tokenValue));
    expect(firstResponse.status).toBe(302);
    const firstLocation = firstResponse.headers.get("location");
    expect(firstLocation).toContain("status=success");

    // Segundo uso — replay do atacante
    const replayResponse = await GET(makeRequest(tokenValue));

    // Verifica HTTP 302 para /confirm?error=already_confirmed
    expect(replayResponse.status).toBe(302);
    const replayLocation = replayResponse.headers.get("location");
    expect(replayLocation).toContain("/confirm");
    expect(replayLocation).toContain("error=already_confirmed");

    // Verifica que nenhum dado sensivel e exposto no redirect
    // (o Location header nao deve conter dados de conta ou token)
    expect(replayLocation).not.toContain("passwordHash");
    expect(replayLocation).not.toContain("password_hash");
    expect(replayLocation).not.toContain("loginUrl");

    // Verifica que o status da conta permanece "active" (nao foi alterado pelo replay)
    const userRows = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, userId));

    expect(userRows[0]?.status).toBe("active");
  });
});

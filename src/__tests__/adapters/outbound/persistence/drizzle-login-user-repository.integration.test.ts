// Testes de integração — DrizzleLoginUserRepository
// IT-1: findByIdentifier por username — Rastreabilidade: REQ-2 · REQ-5
// IT-2: findByIdentifier por email    — Rastreabilidade: REQ-2
//
// Pré-requisito: banco MySQL de teste rodando com migration aplicada.
// DATABASE_URL deve apontar para o banco de teste.

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DrizzleLoginUserRepository } from "@/adapters/outbound/persistence/drizzle-login-user-repository";

// Fecha a conexão com o banco após todos os describes
afterAll(async () => {
  await (db.$client as { end?: () => Promise<void> }).end?.();
});

// ───── IT-1: findByIdentifier por username ─────

describe("IT-1: DrizzleLoginUserRepository — findByIdentifier por username", () => {
  const repo = new DrizzleLoginUserRepository();

  const activeUsername = `login-active-${randomUUID().slice(0, 8)}`;
  const pendingUsername = `login-pending-${randomUUID().slice(0, 8)}`;
  let activeUserId: string;
  let pendingUserId: string;

  beforeAll(async () => {
    // Insere usuário active para busca por username
    activeUserId = randomUUID();
    await db.insert(users).values({
      id: activeUserId,
      name: "Login Active User",
      username: activeUsername,
      email: `${activeUserId}@example.com`,
      passwordHash: "$argon2id$v=19$it1-login-test",
      birthDate: new Date("1990-01-01"),
      avatarKey: null,
      status: "active",
    });

    // Insere usuário pending — findByIdentifier deve retornar null
    pendingUserId = randomUUID();
    await db.insert(users).values({
      id: pendingUserId,
      name: "Login Pending User",
      username: pendingUsername,
      email: `${pendingUserId}@example.com`,
      passwordHash: "$argon2id$v=19$it1-login-test",
      birthDate: new Date("1990-01-01"),
      avatarKey: null,
      status: "pending",
    });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.passwordHash, "$argon2id$v=19$it1-login-test"));
  });

  it("retorna LoginUser com id, username, email e passwordHash quando username existe e status = active", async () => {
    const result = await repo.findByIdentifier(activeUsername);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(activeUserId);
    expect(result!.username).toBe(activeUsername);
    expect(result!.email).toBe(`${activeUserId}@example.com`);
    expect(result!.passwordHash).toBe("$argon2id$v=19$it1-login-test");
    expect(result!.status).toBe("active");
  });

  it("retorna null quando username não existe", async () => {
    const result = await repo.findByIdentifier("username-que-nao-existe-xyz");

    expect(result).toBeNull();
  });

  it("retorna null quando usuário existe mas status = pending", async () => {
    const result = await repo.findByIdentifier(pendingUsername);

    expect(result).toBeNull();
  });
});

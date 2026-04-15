// Teste de segurança — senhas nunca persistidas em texto simples
// ST-3: Rastreabilidade: NFR-2 · T-16
//
// Vetor de ataque: acesso direto ao banco de dados, extração do campo password_hash.
// Verifica que o valor armazenado não é a senha original e identifica argon2id.

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import { Argon2PasswordHasher } from "@/adapters/outbound/persistence/argon2-password-hasher";

describe("ST-3: Senhas nunca persistidas em texto simples", () => {
  const repo = new DrizzleUserRepository();
  const hasher = new Argon2PasswordHasher();

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, "st3-test@example.com"));
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  it("password_hash no banco não é igual à senha original (NFR-2)", async () => {
    const plainPassword = "Senha@Secreta123!";
    const passwordHash = await hasher.hash(plainPassword);

    const id = randomUUID();
    await repo.create({
      id,
      name: "Teste Segurança",
      username: "st3-testuser",
      email: "st3-test@example.com",
      passwordHash,
      birthDate: new Date("1995-03-20"),
      avatarKey: null,
      status: "pending",
    });

    // Consulta direta ao banco para verificar o valor armazenado
    const rows = await db.select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const storedHash = rows[0]?.passwordHash;
    expect(storedHash).toBeDefined();

    // O hash armazenado NÃO deve ser igual à senha em texto simples
    expect(storedHash).not.toBe(plainPassword);

    // O hash deve começar com o identificador do algoritmo argon2id
    expect(storedHash).toMatch(/^\$argon2id\$/);
  }, 30000);
});

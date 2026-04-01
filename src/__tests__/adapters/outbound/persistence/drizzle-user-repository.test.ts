// Testes de integração — DrizzleUserRepository
// IT-1: Rastreabilidade: REQ-3 · REQ-8 · T-08 · T-10
//
// Pré-requisito: banco MySQL de teste rodando com migration aplicada.
// DATABASE_URL deve apontar para o banco de teste.

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import type { CreateUserInput } from "@/domain/ports/user-repository";

// Helper para gerar um input válido de criação de usuário
function makeCreateInput(overrides: Partial<CreateUserInput> = {}): CreateUserInput {
  return {
    id: randomUUID(),
    name: "Teste Integração",
    email: `test-${randomUUID()}@example.com`,
    passwordHash: "$argon2id$v=19$test",
    birthDate: new Date("1990-06-15"),
    avatarUrl: null,
    status: "pending",
    ...overrides,
  };
}

describe("IT-1: DrizzleUserRepository — create() e findByEmail()", () => {
  const repo = new DrizzleUserRepository();

  // Limpa registros criados pelos testes após cada caso
  afterEach(async () => {
    // Remove apenas registros de teste (emails com padrão test-<uuid>@example.com)
    await db.delete(users).where(
      eq(users.email, "duplicate@example.com"),
    );
  });

  afterAll(async () => {
    // Limpa qualquer resíduo da suíte inteira
    // A tabela pode conter registros de outros testes; deleta apenas os criados aqui
    // identificados pelo padrão de passwordHash usado nos testes
    await db.delete(users).where(eq(users.passwordHash, "$argon2id$v=19$test"));

    // Fecha a conexão do pool para evitar que Jest fique aguardando handles abertos
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  describe("create()", () => {
    it("persiste o usuário com todos os campos e retorna entidade User", async () => {
      const input = makeCreateInput({
        name: "João Silva",
        avatarUrl: "https://example.com/avatar.jpg",
      });

      const user = await repo.create(input);

      expect(user.id).toBe(input.id);
      expect(user.name).toBe("João Silva");
      expect(user.email).toBe(input.email);
      expect(user.passwordHash).toBe("$argon2id$v=19$test");
      expect(user.status).toBe("pending");
      expect(user.avatarUrl).toBe("https://example.com/avatar.jpg");
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it("persiste usuário com avatarUrl null", async () => {
      const input = makeCreateInput({ avatarUrl: null });

      const user = await repo.create(input);

      expect(user.avatarUrl).toBeNull();
    });
  });

  describe("findByEmail()", () => {
    it("retorna o usuário correto quando o email existe (REQ-8)", async () => {
      const input = makeCreateInput({ name: "Maria Souza" });
      await repo.create(input);

      const found = await repo.findByEmail(input.email);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(input.id);
      expect(found!.name).toBe("Maria Souza");
      expect(found!.email).toBe(input.email);
    });

    it("retorna null quando o email não existe", async () => {
      const result = await repo.findByEmail("nao-existe@example.com");
      expect(result).toBeNull();
    });
  });

  describe("constraint UNIQUE em email (REQ-3)", () => {
    it("lança erro ao tentar criar segundo usuário com o mesmo email", async () => {
      const input = makeCreateInput({ email: "duplicate@example.com" });
      await repo.create(input);

      const duplicateInput = makeCreateInput({ email: "duplicate@example.com" });

      await expect(repo.create(duplicateInput)).rejects.toThrow();
    });
  });
});

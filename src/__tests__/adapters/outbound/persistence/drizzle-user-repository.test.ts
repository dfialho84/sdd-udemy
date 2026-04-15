// Testes de integração — DrizzleUserRepository
// IT-1: Rastreabilidade: REQ-3 · REQ-8 · T-08 · T-10
// IT-2: Rastreabilidade: REQ-10 · REQ-12 · T-37 · T-41
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
    username: `testuser-${randomUUID()}`,
    email: `test-${randomUUID()}@example.com`,
    passwordHash: "$argon2id$v=19$test",
    birthDate: new Date("1990-06-15"),
    avatarKey: null,
    status: "pending",
    ...overrides,
  };
}

// Fecha a conexão com o banco após todos os describes
afterAll(async () => {
  await (db.$client as { end?: () => Promise<void> }).end?.();
});

describe("IT-1: DrizzleUserRepository — create() e findByEmail()", () => {
  const repo = new DrizzleUserRepository();

  // Limpa registros de email duplicado criados pelo caso específico
  afterEach(async () => {
    await db.delete(users).where(eq(users.email, "duplicate@example.com"));
  });

  afterAll(async () => {
    // Limpa registros remanescentes deste grupo identificados pelo passwordHash de teste
    await db.delete(users).where(eq(users.passwordHash, "$argon2id$v=19$test"));
  });

  describe("create()", () => {
    it("persiste o usuário com todos os campos e retorna entidade User", async () => {
      const input = makeCreateInput({
        name: "João Silva",
        avatarKey: "https://example.com/avatar.jpg",
      });

      const user = await repo.create(input);

      expect(user.id).toBe(input.id);
      expect(user.name).toBe("João Silva");
      expect(user.email).toBe(input.email);
      expect(user.passwordHash).toBe("$argon2id$v=19$test");
      expect(user.status).toBe("pending");
      expect(user.avatarKey).toBe("https://example.com/avatar.jpg");
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it("persiste usuário com avatarKey null", async () => {
      const input = makeCreateInput({ avatarKey: null });

      const user = await repo.create(input);

      expect(user.avatarKey).toBeNull();
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

describe("IT-2: DrizzleUserRepository — activate() e delete()", () => {
  const repo = new DrizzleUserRepository();
  let pendingUserId: string;

  // Cria um usuário pending antes de cada teste deste grupo
  beforeEach(async () => {
    const input = makeCreateInput({ status: "pending" });
    const user = await repo.create(input);
    pendingUserId = user.id;
  });

  // Remove o usuário criado após cada teste (se ainda existir)
  afterEach(async () => {
    try {
      await db.delete(users).where(eq(users.id, pendingUserId));
    } catch {
      // ignora caso já tenha sido removido pelo teste
    }
  });

  describe("activate() — REQ-10 · IT-2a", () => {
    it("atualiza status do usuário pending para active no banco", async () => {
      // Verifica que o usuário começa como pending
      const before = await repo.findById(pendingUserId);
      expect(before).not.toBeNull();
      expect(before!.status).toBe("pending");

      await repo.activate(pendingUserId);

      const after = await repo.findById(pendingUserId);
      expect(after).not.toBeNull();
      expect(after!.status).toBe("active");
    });

    it("activate não altera outros campos do usuário (nome, email, passwordHash)", async () => {
      const before = await repo.findById(pendingUserId);
      expect(before).not.toBeNull();

      await repo.activate(pendingUserId);

      const after = await repo.findById(pendingUserId);
      expect(after).not.toBeNull();
      expect(after!.name).toBe(before!.name);
      expect(after!.email).toBe(before!.email);
      expect(after!.passwordHash).toBe(before!.passwordHash);
    });
  });

  describe("delete() — REQ-12 · IT-2b", () => {
    it("remove o usuário do banco — findById subsequente retorna null", async () => {
      // Verifica que o usuário existe antes
      const before = await repo.findById(pendingUserId);
      expect(before).not.toBeNull();

      await repo.delete(pendingUserId);

      const after = await repo.findById(pendingUserId);
      expect(after).toBeNull();
    });

    it("delete de id inexistente não lança exceção", async () => {
      const fakeId = randomUUID();

      await expect(repo.delete(fakeId)).resolves.not.toThrow();
    });
  });
});

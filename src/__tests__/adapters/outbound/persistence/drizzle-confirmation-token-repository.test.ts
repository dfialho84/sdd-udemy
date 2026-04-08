// Testes de integração — DrizzleConfirmationTokenRepository
// IT-3 (completo): Rastreabilidade: REQ-9 · REQ-14 · REQ-15 · NFR-3 · T-31 · T-33
//
// Cobre os métodos create(), findByToken() e markAsUsed().
//
// Pré-requisito: banco MySQL de teste rodando com migration aplicada.
// DATABASE_URL deve apontar para o banco de teste.

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, confirmationTokens } from "@/lib/db/schema";
import { DrizzleConfirmationTokenRepository } from "@/adapters/outbound/persistence/drizzle-confirmation-token-repository";
import type { CreateConfirmationTokenInput } from "@/domain/ports/confirmation-token-repository";

// Helper: cria um usuário diretamente no banco (FK obrigatória)
async function createTestUser(): Promise<string> {
  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    name: "Usuário Teste Token",
    email: `token-test-${userId}@example.com`,
    passwordHash: "$argon2id$v=19$token-test",
    birthDate: new Date("1990-01-01"),
    avatarKey: null,
    status: "pending",
  });
  return userId;
}

// Helper: cria um input válido de token
function makeTokenInput(
  userId: string,
  overrides: Partial<CreateConfirmationTokenInput> = {},
): CreateConfirmationTokenInput {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
  return {
    id: randomUUID(),
    userId,
    token: randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""), // 64 hex chars
    expiresAt,
    usedAt: null,
    ...overrides,
  };
}

describe("IT-3: DrizzleConfirmationTokenRepository — create(), findByToken() e markAsUsed()", () => {
  const repo = new DrizzleConfirmationTokenRepository();
  let testUserId: string;

  beforeAll(async () => {
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    // Remove tokens e usuário criados pelos testes
    await db
      .delete(confirmationTokens)
      .where(eq(confirmationTokens.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));

    // Fecha a conexão do pool para evitar que Jest fique aguardando handles abertos
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  describe("create()", () => {
    it("persiste o token com expires_at correto (+24h) e used_at = null (REQ-9 · NFR-3)", async () => {
      const input = makeTokenInput(testUserId);
      const beforeCreate = new Date();

      const result = await repo.create(input);

      expect(result.id).toBe(input.id);
      expect(result.userId).toBe(testUserId);
      expect(result.token).toBe(input.token);
      expect(result.usedAt).toBeNull();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.createdAt).toBeInstanceOf(Date);

      // expires_at deve ser aproximadamente 24h após a criação
      const diffMs = result.expiresAt.getTime() - beforeCreate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(23.9);
      expect(diffHours).toBeLessThanOrEqual(24.1);
    });

    it("persiste o token e retorna entidade ConfirmationToken com todos os campos", async () => {
      const input = makeTokenInput(testUserId);

      const result = await repo.create(input);

      expect(result.id).toBe(input.id);
      expect(result.token).toBe(input.token);
      expect(result.userId).toBe(input.userId);
      expect(result.isUsed()).toBe(false);
      expect(result.isExpired()).toBe(false);
    });
  });

  describe("findByToken()", () => {
    it("retorna o token correto quando existe no banco (REQ-9)", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      const found = await repo.findByToken(input.token);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(input.id);
      expect(found!.userId).toBe(testUserId);
      expect(found!.token).toBe(input.token);
      expect(found!.usedAt).toBeNull();
    });

    it("retorna null para token inexistente no banco", async () => {
      const fakeToken = "a".repeat(64);

      const result = await repo.findByToken(fakeToken);

      expect(result).toBeNull();
    });

    it("token retornado tem isExpired() = false quando expires_at está no futuro", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      const found = await repo.findByToken(input.token);

      expect(found).not.toBeNull();
      expect(found!.isExpired()).toBe(false);
    });
  });

  describe("markAsUsed()", () => {
    it("atualiza used_at para o instante atual após a chamada (REQ-14 · REQ-15 · NFR-3)", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      const beforeMark = new Date();
      await repo.markAsUsed(input.id);

      const found = await repo.findByToken(input.token);

      expect(found).not.toBeNull();
      expect(found!.usedAt).not.toBeNull();
      expect(found!.usedAt).toBeInstanceOf(Date);

      // used_at deve ser igual ou posterior ao instante antes da chamada
      expect(found!.usedAt!.getTime()).toBeGreaterThanOrEqual(beforeMark.getTime() - 1000);
    });

    it("token marcado como usado tem isUsed() = true na chamada subsequente a findByToken()", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      // Verifica que antes está sem uso
      const before = await repo.findByToken(input.token);
      expect(before!.isUsed()).toBe(false);

      await repo.markAsUsed(input.id);

      const after = await repo.findByToken(input.token);
      expect(after).not.toBeNull();
      expect(after!.isUsed()).toBe(true);
    });

    it("markAsUsed não altera outros campos do token (id, userId, token, expiresAt)", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      await repo.markAsUsed(input.id);

      const found = await repo.findByToken(input.token);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(input.id);
      expect(found!.userId).toBe(testUserId);
      expect(found!.token).toBe(input.token);
      // expires_at deve permanecer inalterado — tolerância de 1 segundo para arredondamento MySQL
      const diffMs = Math.abs(found!.expiresAt.getTime() - input.expiresAt.getTime());
      expect(diffMs).toBeLessThan(1000);
    });
  });
});

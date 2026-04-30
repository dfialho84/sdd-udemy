// Testes de integracao — PasswordResetTokenRepositoryDrizzle
// IT-1, IT-2, IT-3: Rastreabilidade: T-06 · REQ-4 · REQ-6 · NFR-3 · REQ-7 · REQ-12 · REQ-13 · NFR-4
//
// Pre-requisito: banco MySQL de teste rodando com migration aplicada.
// DATABASE_URL deve apontar para o banco de teste.

import { randomUUID } from "crypto";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { PasswordResetTokenRepositoryDrizzle } from "@/adapters/outbound/persistence/drizzle-password-reset-token-repository";
import type { CreatePasswordResetTokenParams } from "@/domain/ports/password-reset-token-repository";

function sha256(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

// Helper: cria um usuario diretamente no banco (FK obrigatoria)
async function createTestUser(): Promise<string> {
  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    name: "Usuario Teste Reset Token",
    username: `reset-user-${userId}`,
    email: `reset-test-${userId}@example.com`,
    passwordHash: "$argon2id$v=19$reset-test",
    birthDate: new Date("1990-01-01"),
    avatarKey: null,
    status: "active",
  });
  return userId;
}

// Helper: cria um input valido de token
function makeTokenInput(
  userId: string,
  overrides: Partial<CreatePasswordResetTokenParams> = {},
): CreatePasswordResetTokenParams {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // +12h
  return {
    userId,
    tokenHash: sha256(randomUUID()),
    expiresAt,
    ...overrides,
  };
}

describe("IT-1, IT-2, IT-3: PasswordResetTokenRepositoryDrizzle", () => {
  const repo = new PasswordResetTokenRepositoryDrizzle();
  let testUserId: string;

  beforeAll(async () => {
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  // ─── IT-1: create() ─────────────────────────────────────────────────────

  describe("IT-1: create()", () => {
    it("persiste token com campos corretos e used_at = null (REQ-4 · NFR-3)", async () => {
      const input = makeTokenInput(testUserId);

      await repo.create(input);

      const rows = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, input.tokenHash))
        .limit(1);

      expect(rows.length).toBe(1);
      expect(rows[0]!.tokenHash).toBe(input.tokenHash);
      expect(rows[0]!.userId).toBe(testUserId);
      expect(rows[0]!.usedAt).toBeNull();

      // expires_at deve ser aproximadamente 12h apos criacao
      const diffMs = rows[0]!.expiresAt.getTime() - input.expiresAt.getTime();
      expect(Math.abs(diffMs)).toBeLessThan(1000);
    });

    it("user_id inexistente viola FK e lanca erro", async () => {
      const fakeUserId = randomUUID();
      const input = makeTokenInput(fakeUserId);

      await expect(repo.create(input)).rejects.toThrow();
    });
  });

  // ─── IT-2: findByHash() ─────────────────────────────────────────────────

  describe("IT-2: findByHash()", () => {
    it("retorna entidade PasswordResetToken quando hash existe no banco (REQ-7)", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      const found = await repo.findByHash(input.tokenHash);

      expect(found).not.toBeNull();
      expect(found!.tokenHash).toBe(input.tokenHash);
      expect(found!.userId).toBe(testUserId);
      expect(found!.usedAt).toBeNull();
      expect(found!.isExpired()).toBe(false);
      expect(found!.isUsed()).toBe(false);
    });

    it("retorna null para hash inexistente no banco (REQ-12 · REQ-13)", async () => {
      const fakeHash = sha256("token-que-nao-existe-no-banco");

      const result = await repo.findByHash(fakeHash);

      expect(result).toBeNull();
    });

    it("token retornado tem isExpired() = false quando expires_at esta no futuro", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      const found = await repo.findByHash(input.tokenHash);

      expect(found).not.toBeNull();
      expect(found!.isExpired()).toBe(false);
    });
  });

  // ─── IT-3: markAsUsed() ─────────────────────────────────────────────────

  describe("IT-3: markAsUsed()", () => {
    it("preenche used_at apos chamada (REQ-6 · NFR-4)", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      const beforeMark = new Date();
      await repo.markAsUsed(input.tokenHash);

      const rows = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, input.tokenHash))
        .limit(1);

      expect(rows.length).toBe(1);
      expect(rows[0]!.usedAt).not.toBeNull();
      expect(rows[0]!.usedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeMark.getTime() - 1000,
      );
    });

    it("token marcado tem isUsed() = true na chamada subsequente a findByHash()", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      const before = await repo.findByHash(input.tokenHash);
      expect(before!.isUsed()).toBe(false);

      await repo.markAsUsed(input.tokenHash);

      const after = await repo.findByHash(input.tokenHash);
      expect(after).not.toBeNull();
      expect(after!.isUsed()).toBe(true);
    });

    it("operacao idempotente em token ja marcado (nao lanca erro)", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      await repo.markAsUsed(input.tokenHash);
      // Segunda chamada nao deve lancar erro
      await expect(repo.markAsUsed(input.tokenHash)).resolves.toBeUndefined();

      const found = await repo.findByHash(input.tokenHash);
      expect(found!.isUsed()).toBe(true);
    });

    it("markAsUsed nao altera outros campos do token (tokenHash, userId, expiresAt)", async () => {
      const input = makeTokenInput(testUserId);
      await repo.create(input);

      await repo.markAsUsed(input.tokenHash);

      const found = await repo.findByHash(input.tokenHash);

      expect(found).not.toBeNull();
      expect(found!.tokenHash).toBe(input.tokenHash);
      expect(found!.userId).toBe(testUserId);
      const diffMs = Math.abs(
        found!.expiresAt.getTime() - input.expiresAt.getTime(),
      );
      expect(diffMs).toBeLessThan(1000);
    });
  });
});

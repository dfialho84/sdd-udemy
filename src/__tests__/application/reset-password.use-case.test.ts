// Testes unitarios do ResetPasswordUseCase
// UT-9 (redefinicao bem-sucedida), UT-10 (senha fraca), UT-11 (token ja utilizado), UT-12 (token expirado)
// Rastreabilidade: T-12 · REQ-6 · REQ-10 · REQ-8 · NFR-4 · REQ-12

import {
  ResetPasswordUseCase,
  TokenAlreadyUsedError,
  TokenExpiredError,
  TokenInvalidError,
  WeakPasswordError,
} from "@/application/use-cases/reset-password.use-case";
import { PasswordResetToken } from "@/domain/entities/password-reset-token";
import { createHash } from "node:crypto";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { AuditLogger } from "@/domain/ports/audit-logger";

function sha256(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

// ─── Fixtures ──────────────────────────────────────────────────────────

const VALID_TOKEN = "valid-token-for-reset-1234567890abcdef";
const VALID_TOKEN_HASH = sha256(VALID_TOKEN);
const USER_ID = "user-uuid-123";
const STRONG_PASSWORD = "Str0ng!Pass";
const HASHED_PASSWORD = "$argon2id$v=19$m=65536,t=3,p=4$mockhash";

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 60 * 60 * 1000); // +1h (valido)
const PAST = new Date(NOW.getTime() - 60 * 60 * 1000); // -1h (expirado)

const VALID_ENTITY = new PasswordResetToken({
  tokenHash: VALID_TOKEN_HASH,
  expiresAt: FUTURE,
  usedAt: null,
  userId: USER_ID,
});

const EXPIRED_ENTITY = new PasswordResetToken({
  tokenHash: sha256("expired-token"),
  expiresAt: PAST,
  usedAt: null,
  userId: USER_ID,
});

const USED_ENTITY = new PasswordResetToken({
  tokenHash: sha256("used-token"),
  expiresAt: FUTURE,
  usedAt: new Date(NOW.getTime() - 1000),
  userId: USER_ID,
});

// ─── Factory de mocks ──────────────────────────────────────────────────

interface MockRepositories {
  passwordResetTokenRepository: IPasswordResetTokenRepository;
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  auditLogger: AuditLogger;
}

function makeMocks(overrides: {
  findByHash?: jest.Mock;
  markAsUsed?: jest.Mock;
  updatePassword?: jest.Mock;
  invalidateAllSessions?: jest.Mock;
  hash?: jest.Mock;
  log?: jest.Mock;
} = {}): MockRepositories {
  return {
    passwordResetTokenRepository: {
      findByHash: overrides.findByHash ?? jest.fn().mockResolvedValue(VALID_ENTITY),
      create: jest.fn(),
      markAsUsed: overrides.markAsUsed ?? jest.fn().mockResolvedValue(undefined),
    },
    userRepository: {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      activate: jest.fn(),
      updatePassword: overrides.updatePassword ?? jest.fn().mockResolvedValue(undefined),
      invalidateAllSessions: overrides.invalidateAllSessions ?? jest.fn().mockResolvedValue(undefined),
    },
    passwordHasher: {
      hash: overrides.hash ?? jest.fn().mockResolvedValue(HASHED_PASSWORD),
    },
    auditLogger: {
      log: overrides.log ?? jest.fn().mockResolvedValue(undefined),
    },
  };
}

function createUseCase(mocks: MockRepositories): ResetPasswordUseCase {
  return new ResetPasswordUseCase(
    mocks.passwordResetTokenRepository,
    mocks.userRepository,
    mocks.passwordHasher,
    mocks.auditLogger,
  );
}

// ─── UT-9: Redefinicao bem-sucedida ───────────────────────────────────

describe("UT-9: ResetPasswordUseCase.execute() — redefinicao bem-sucedida (REQ-10)", () => {
  it("chama updatePassword, invalidateAllSessions e markAsUsed", async () => {
    const updatePassword = jest.fn().mockResolvedValue(undefined);
    const invalidateAllSessions = jest.fn().mockResolvedValue(undefined);
    const markAsUsed = jest.fn().mockResolvedValue(undefined);
    const hash = jest.fn().mockResolvedValue(HASHED_PASSWORD);
    const log = jest.fn().mockResolvedValue(undefined);

    const useCase = createUseCase(
      makeMocks({ updatePassword, invalidateAllSessions, markAsUsed, hash, log }),
    );

    await useCase.execute(VALID_TOKEN, STRONG_PASSWORD);

    // Verifica que a senha foi hasheada e atualizada
    expect(hash).toHaveBeenCalledWith(STRONG_PASSWORD);
    expect(updatePassword).toHaveBeenCalledWith(USER_ID, HASHED_PASSWORD);

    // Verifica que sessoes foram invalidadas
    expect(invalidateAllSessions).toHaveBeenCalledWith(USER_ID);

    // Verifica que token foi marcado como usado
    expect(markAsUsed).toHaveBeenCalledWith(VALID_TOKEN_HASH);

    // Verifica auditoria
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PASSWORD_RESET_COMPLETED",
        userId: USER_ID,
      }),
    );
  });

  it("persiste hash com algoritmo seguro (argon2id delegado ao PasswordHasher)", async () => {
    const hash = jest.fn().mockResolvedValue(HASHED_PASSWORD);
    const useCase = createUseCase(makeMocks({ hash }));

    await useCase.execute(VALID_TOKEN, STRONG_PASSWORD);

    expect(hash).toHaveBeenCalledWith(STRONG_PASSWORD);
  });
});

// ─── UT-10: Senha fraca ──────────────────────────────────────────────

describe("UT-10: ResetPasswordUseCase.execute() — senha fraca (REQ-8)", () => {
  it("rejeita senha curta sem alterar nada", async () => {
    const updatePassword = jest.fn();
    const invalidateAllSessions = jest.fn();
    const markAsUsed = jest.fn();

    const useCase = createUseCase(
      makeMocks({ updatePassword, invalidateAllSessions, markAsUsed }),
    );

    await expect(useCase.execute(VALID_TOKEN, "Ab1!")).rejects.toThrow(WeakPasswordError);
    expect(updatePassword).not.toHaveBeenCalled();
    expect(invalidateAllSessions).not.toHaveBeenCalled();
    expect(markAsUsed).not.toHaveBeenCalled();
  });

  it("rejeita senha sem caractere especial", async () => {
    const updatePassword = jest.fn();
    const useCase = createUseCase(makeMocks({ updatePassword }));

    try {
      await useCase.execute(VALID_TOKEN, "Abcdef123");
      fail("Deveria ter lancado excecao");
    } catch (error) {
      expect(error).toBeInstanceOf(WeakPasswordError);
      expect((error as WeakPasswordError).code).toBe("WEAK_PASSWORD");
      expect((error as WeakPasswordError).criteria).toEqual(
        expect.arrayContaining([expect.stringContaining("caractere especial")]),
      );
    }
  });

  it("rejeita senha sem maiuscula", async () => {
    const updatePassword = jest.fn();
    const useCase = createUseCase(makeMocks({ updatePassword }));

    try {
      await useCase.execute(VALID_TOKEN, "abcdef1!@");
      fail("Deveria ter lancado excecao");
    } catch (error) {
      expect((error as WeakPasswordError).criteria).toEqual(
        expect.arrayContaining([expect.stringContaining("maiuscula")]),
      );
    }
  });

  it("rejeita senha sem numero", async () => {
    const updatePassword = jest.fn();
    const useCase = createUseCase(makeMocks({ updatePassword }));

    try {
      await useCase.execute(VALID_TOKEN, "Abcdefgh!");
      fail("Deveria ter lancado excecao");
    } catch (error) {
      expect((error as WeakPasswordError).criteria).toEqual(
        expect.arrayContaining([expect.stringContaining("numero")]),
      );
    }
  });

  it("nenhuma chamada a updatePassword ou invalidateAllSessions apos senha fraca", async () => {
    const updatePassword = jest.fn();
    const invalidateAllSessions = jest.fn();
    const markAsUsed = jest.fn();

    const useCase = createUseCase(
      makeMocks({ updatePassword, invalidateAllSessions, markAsUsed }),
    );

    await expect(useCase.execute(VALID_TOKEN, "fraca")).rejects.toThrow(WeakPasswordError);
    expect(updatePassword).not.toHaveBeenCalled();
    expect(invalidateAllSessions).not.toHaveBeenCalled();
    expect(markAsUsed).not.toHaveBeenCalled();
  });
});

// ─── UT-11: Token ja utilizado ────────────────────────────────────────

describe("UT-11: ResetPasswordUseCase.execute() — token ja utilizado (REQ-6 · NFR-4)", () => {
  it("rejeita token com used_at preenchido antes de qualquer operacao", async () => {
    const findByHash = jest.fn().mockResolvedValue(USED_ENTITY);
    const updatePassword = jest.fn();
    const invalidateAllSessions = jest.fn();
    const markAsUsed = jest.fn();

    const useCase = createUseCase(
      makeMocks({ findByHash, updatePassword, invalidateAllSessions, markAsUsed }),
    );

    await expect(useCase.execute("used-token", STRONG_PASSWORD)).rejects.toThrow(
      TokenAlreadyUsedError,
    );
    expect(updatePassword).not.toHaveBeenCalled();
    expect(invalidateAllSessions).not.toHaveBeenCalled();
    expect(markAsUsed).not.toHaveBeenCalled();
  });
});

// ─── UT-12: Token expirado ────────────────────────────────────────────

describe("UT-12: ResetPasswordUseCase.execute() — token expirado (REQ-12)", () => {
  it("rejeita token com expires_at <= now antes de qualquer operacao", async () => {
    const findByHash = jest.fn().mockResolvedValue(EXPIRED_ENTITY);
    const updatePassword = jest.fn();
    const invalidateAllSessions = jest.fn();
    const markAsUsed = jest.fn();

    const useCase = createUseCase(
      makeMocks({ findByHash, updatePassword, invalidateAllSessions, markAsUsed }),
    );

    await expect(useCase.execute("expired-token", STRONG_PASSWORD)).rejects.toThrow(
      TokenExpiredError,
    );
    expect(updatePassword).not.toHaveBeenCalled();
    expect(invalidateAllSessions).not.toHaveBeenCalled();
    expect(markAsUsed).not.toHaveBeenCalled();
  });
});

// Testes unitarios do ValidateResetTokenUseCase
// UT-6 (token valido), UT-7 (token expirado), UT-8 (token nao encontrado)
// Rastreabilidade: T-10 · REQ-7 · REQ-13 · REQ-12

import {
  ValidateResetTokenUseCase,
  TokenExpiredError,
  TokenInvalidError,
} from "@/application/use-cases/validate-reset-token.use-case";
import { PasswordResetToken } from "@/domain/entities/password-reset-token";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import { createHash } from "node:crypto";

function sha256(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

// ─── Fixtures ──────────────────────────────────────────────────────────

const VALID_TOKEN = "valid-token-para-teste";
const VALID_TOKEN_HASH = sha256(VALID_TOKEN);

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 60 * 60 * 1000); // +1h (valido)
const PAST = new Date(NOW.getTime() - 60 * 60 * 1000); // -1h (expirado)

const VALID_ENTITY = new PasswordResetToken({
  tokenHash: VALID_TOKEN_HASH,
  expiresAt: FUTURE,
  usedAt: null,
  userId: "user-uuid-123",
});

const EXPIRED_ENTITY = new PasswordResetToken({
  tokenHash: sha256("expired-token"),
  expiresAt: PAST,
  usedAt: null,
  userId: "user-uuid-123",
});

const USED_ENTITY = new PasswordResetToken({
  tokenHash: sha256("used-token"),
  expiresAt: FUTURE,
  usedAt: new Date(NOW.getTime() - 1000),
  userId: "user-uuid-123",
});

// ─── UT-6: Token valido ──────────────────────────────────────────────

describe("UT-6: ValidateResetTokenUseCase.execute() — token valido (REQ-7)", () => {
  it("retorna { valid: true } para token valido, nao expirado e nao usado", async () => {
    const mockRepository: IPasswordResetTokenRepository = {
      findByHash: jest.fn().mockResolvedValue(VALID_ENTITY),
      create: jest.fn(),
      markAsUsed: jest.fn(),
    };
    const useCase = new ValidateResetTokenUseCase(mockRepository);

    const result = await useCase.execute(VALID_TOKEN);

    expect(result).toEqual({ valid: true });
  });

  it("rejeita token ja utilizado com TOKEN_INVALID (NFR-4)", async () => {
    const mockRepository: IPasswordResetTokenRepository = {
      findByHash: jest.fn().mockResolvedValue(USED_ENTITY),
      create: jest.fn(),
      markAsUsed: jest.fn(),
    };
    const useCase = new ValidateResetTokenUseCase(mockRepository);

    await expect(useCase.execute("used-token")).rejects.toThrow(
      TokenInvalidError,
    );
  });
});

// ─── UT-7: Token expirado ────────────────────────────────────────────

describe("UT-7: ValidateResetTokenUseCase.execute() — token expirado (REQ-12)", () => {
  it("retorna erro TOKEN_EXPIRED quando expires_at <= now", async () => {
    const mockRepository: IPasswordResetTokenRepository = {
      findByHash: jest.fn().mockResolvedValue(EXPIRED_ENTITY),
      create: jest.fn(),
      markAsUsed: jest.fn(),
    };
    const useCase = new ValidateResetTokenUseCase(mockRepository);

    try {
      await useCase.execute("expired-token");
      fail("Deveria ter lancado excecao");
    } catch (error) {
      expect(error).toBeInstanceOf(TokenExpiredError);
      expect((error as TokenExpiredError).code).toBe("TOKEN_EXPIRED");
      expect((error as TokenExpiredError).message).toBe(
        "O link de recuperacao expirou",
      );
    }
  });
});

// ─── UT-8: Token nao encontrado ──────────────────────────────────────

describe("UT-8: ValidateResetTokenUseCase.execute() — token nao encontrado (REQ-13)", () => {
  it("retorna erro TOKEN_INVALID quando token_hash nao existe no repositorio", async () => {
    const mockRepository: IPasswordResetTokenRepository = {
      findByHash: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      markAsUsed: jest.fn(),
    };
    const useCase = new ValidateResetTokenUseCase(mockRepository);

    try {
      await useCase.execute("token-que-nao-existe");
      fail("Deveria ter lancado excecao");
    } catch (error) {
      expect(error).toBeInstanceOf(TokenInvalidError);
      expect((error as TokenInvalidError).code).toBe("TOKEN_INVALID");
      expect((error as TokenInvalidError).message).toBe(
        "O link de recuperacao e invalido",
      );
    }
  });
});

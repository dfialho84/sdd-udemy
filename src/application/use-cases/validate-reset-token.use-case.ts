// ValidateResetTokenUseCase — camada application (Domain)
// Valida se um token de recuperacao de senha e valido, expirado ou invalido.
// Rastreabilidade: T-10 · REQ-7 · REQ-12 · REQ-13 · NFR-4

import { createHash } from "node:crypto";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";

// ─── Output ──────────────────────────────────────────────────────────

export interface ValidateResetTokenOutput {
  valid: true;
}

// ─── Erros tipados ───────────────────────────────────────────────────

export class TokenExpiredError extends Error {
  readonly code = "TOKEN_EXPIRED" as const;

  constructor() {
    super("O link de recuperacao expirou");
    this.name = "TokenExpiredError";
  }
}

export class TokenInvalidError extends Error {
  readonly code = "TOKEN_INVALID" as const;

  constructor() {
    super("O link de recuperacao e invalido");
    this.name = "TokenInvalidError";
  }
}

// ─── Use Case ────────────────────────────────────────────────────────

export class ValidateResetTokenUseCase {
  constructor(
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
  ) {}

  /**
   * Valida um token de recuperacao.
   * 1. Calcula SHA-256 do token recebido
   * 2. Busca no repositorio pelo hash
   * 3. Verifica se encontrado, nao usado e nao expirado
   *
   * Retornos:
   * - Token valido: { valid: true }
   * - Token expirado: lanca TokenExpiredError (TOKEN_EXPIRED)
   * - Token nao encontrado: lanca TokenInvalidError (TOKEN_INVALID)
   *
   * Rastreabilidade: REQ-7 · REQ-12 · REQ-13 · NFR-4
   */
  async execute(token: string): Promise<ValidateResetTokenOutput> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const found = await this.passwordResetTokenRepository.findByHash(tokenHash);

    if (found === null) {
      throw new TokenInvalidError();
    }

    if (found.isExpired()) {
      throw new TokenExpiredError();
    }

    if (found.isUsed()) {
      throw new TokenInvalidError();
    }

    return { valid: true };
  }
}

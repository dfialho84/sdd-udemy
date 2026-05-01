// ResetPasswordUseCase — camada application (Domain)
// Orquestra o fluxo de redefinicao de senha: validar token, validar forca da senha,
// atualizar hash da senha, invalidar sessoes, invalidar token.
// Rastreabilidade: T-12 · REQ-10 · REQ-8 · REQ-6 · NFR-4

import { createHash } from "node:crypto";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { AuditLogger } from "@/domain/ports/audit-logger";

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

export class TokenAlreadyUsedError extends Error {
  readonly code = "TOKEN_INVALID" as const;

  constructor() {
    super("O link de recuperacao e invalido");
    this.name = "TokenAlreadyUsedError";
  }
}

export class WeakPasswordError extends Error {
  readonly code = "WEAK_PASSWORD" as const;
  readonly criteria: string[];

  constructor(criteria: string[]) {
    super(`Senha nao atende aos criterios de forca: ${criteria.join(", ")}`);
    this.name = "WeakPasswordError";
    this.criteria = criteria;
  }
}

// ─── Password strength rules ─────────────────────────────────────────

export interface PasswordCriteria {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

const DEFAULT_CRITERIA: PasswordCriteria = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

export function validatePasswordStrength(
  password: string,
  criteria: PasswordCriteria = DEFAULT_CRITERIA,
): string[] {
  const failures: string[] = [];

  if (password.length < criteria.minLength) {
    failures.push(`Minimo de ${criteria.minLength} caracteres`);
  }
  if (criteria.requireUppercase && !/[A-Z]/.test(password)) {
    failures.push("Pelo menos uma letra maiuscula");
  }
  if (criteria.requireLowercase && !/[a-z]/.test(password)) {
    failures.push("Pelo menos uma letra minuscula");
  }
  if (criteria.requireNumbers && !/[0-9]/.test(password)) {
    failures.push("Pelo menos um numero");
  }
  if (criteria.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    failures.push("Pelo menos um caractere especial");
  }

  return failures;
}

// ─── Use Case ────────────────────────────────────────────────────────

export class ResetPasswordUseCase {
  constructor(
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly auditLogger: AuditLogger,
  ) {}

  /**
   * Executa a redefinicao de senha:
   * 1. Valida token (existencia, expiracao, uso)
   * 2. Valida forca da senha
   * 3. Gera hash da nova senha
   * 4. Atualiza password_hash do usuario
   * 5. Invalida sessoes ativas
   * 6. Invalida token (markAsUsed)
   * 7. Registra auditoria
   *
   * Rastreabilidade: REQ-10 · REQ-8 · REQ-6 · NFR-4
   */
  async execute(token: string, password: string): Promise<void> {
    // 1. Calcular hash do token e buscar no repositorio
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const found = await this.passwordResetTokenRepository.findByHash(tokenHash);

    if (found === null) {
      throw new TokenInvalidError();
    }

    if (found.isExpired()) {
      throw new TokenExpiredError();
    }

    if (found.isUsed()) {
      throw new TokenAlreadyUsedError();
    }

    // 2. Validar forca da senha (REQ-8)
    const failures = validatePasswordStrength(password);
    if (failures.length > 0) {
      throw new WeakPasswordError(failures);
    }

    // 3. Gerar hash da nova senha
    const newPasswordHash = await this.passwordHasher.hash(password);

    // 4. Atualizar password_hash do usuario (REQ-10)
    await this.userRepository.updatePassword(found.userId, newPasswordHash);

    // 5. Invalidar sessoes ativas (REQ-10)
    await this.userRepository.invalidateAllSessions(found.userId);

    // 6. Invalidar token (NFR-4)
    await this.passwordResetTokenRepository.markAsUsed(tokenHash);

    // 7. Registrar auditoria (NFR-6)
    await this.auditLogger.log({
      type: "PASSWORD_RESET_COMPLETED",
      timestamp: new Date(),
      userId: found.userId,
    });
  }
}

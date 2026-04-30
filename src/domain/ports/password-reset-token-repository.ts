// Port outbound — PasswordResetTokenRepository
// Rastreabilidade: T-05 · REQ-4 · REQ-6

import type { PasswordResetToken } from "../entities/password-reset-token";

export interface CreatePasswordResetTokenParams {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IPasswordResetTokenRepository {
  /**
   * Persiste um novo token de recuperacao de senha.
   * Rastreabilidade: REQ-4
   */
  create(data: CreatePasswordResetTokenParams): Promise<void>;

  /**
   * Busca um token pelo hash SHA-256.
   * Retorna a entidade PasswordResetToken ou null se nao encontrado.
   * Rastreabilidade: REQ-4 · REQ-6
   */
  findByHash(tokenHash: string): Promise<PasswordResetToken | null>;

  /**
   * Marca o token como utilizado, preenchendo used_at com o timestamp atual.
   * Rastreabilidade: REQ-6 · NFR-4
   */
  markAsUsed(tokenHash: string): Promise<void>;
}

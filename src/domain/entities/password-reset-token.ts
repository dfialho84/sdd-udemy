// Entidade PasswordResetToken — camada domain
// Rastreabilidade: T-03 · REQ-4 · NFR-3 · REQ-12 · REQ-6

import { createHash } from "node:crypto";

export interface PasswordResetTokenProps {
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  userId: string;
}

export class PasswordResetToken {
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly userId: string;

  constructor(props: PasswordResetTokenProps) {
    this.tokenHash = props.tokenHash;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt;
    this.userId = props.userId;
  }

  /**
   * Retorna true se o token ja expirou (expiresAt <= now).
   * Rastreabilidade: REQ-4 · REQ-12
   */
  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt <= now;
  }

  /**
   * Retorna true se o token ja foi utilizado (usedAt nao e null).
   * Rastreabilidade: REQ-6 · NFR-4
   */
  isUsed(): boolean {
    return this.usedAt !== null;
  }

  /**
   * Calcula SHA-256 do plainToken fornecido e compara com tokenHash armazenado.
   * Retorna true se coincidirem.
   * Rastreabilidade: NFR-3 · REQ-13
   */
  compareHash(plainToken: string): boolean {
    if (!plainToken) return false;
    const hash = createHash("sha256").update(plainToken).digest("hex");
    return hash === this.tokenHash;
  }
}

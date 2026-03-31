// Entidade ConfirmationToken — camada domain
// Rastreabilidade: REQ-9 · REQ-12 · REQ-14 · REQ-15 · NFR-3 · T-06

export interface ConfirmationTokenProps {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class ConfirmationToken {
  readonly id: string;
  readonly userId: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly createdAt: Date;

  constructor(props: ConfirmationTokenProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.token = props.token;
    this.expiresAt = props.expiresAt;
    this.usedAt = props.usedAt;
    this.createdAt = props.createdAt;
  }

  /**
   * Retorna true se o token já expirou (expiresAt <= agora).
   * Rastreabilidade: REQ-12 · REQ-13
   */
  isExpired(now: Date = new Date()): boolean {
    return this.expiresAt <= now;
  }

  /**
   * Retorna true se o token já foi utilizado (usedAt não nulo).
   * Rastreabilidade: REQ-14 · REQ-15
   */
  isUsed(): boolean {
    return this.usedAt !== null;
  }
}

// PasswordResetRateLimiter — adapter inbound de rate limiting
// Implementacao concreta de IRateLimitService com contador in-memory por IP.
// Limite: 5 tentativas por IP por hora (janela deslizante — NFR-5).
// Rastreabilidade: T-17 · REQ-16 · REQ-17 · NFR-5

import type {
  IRateLimitService,
  RateLimitCheckResult,
} from "@/domain/ports/rate-limit-service";

interface RateLimitEntry {
  count: number;
  firstAttemptAt: number;
}

export interface PasswordResetRateLimiterConfig {
  /** Numero maximo de tentativas permitidas na janela (default: 5) */
  maxAttempts: number;
  /** Duracao da janela em milissegundos (default: 1 hora) */
  windowMs: number;
  /** Funcao de tempo — substituivel em testes */
  now?: () => number;
}

const DEFAULT_CONFIG: Required<PasswordResetRateLimiterConfig> = {
  maxAttempts: 5,
  windowMs: 60 * 60 * 1000, // 1 hora
  now: Date.now,
};

export class PasswordResetRateLimiter implements IRateLimitService {
  private readonly store: Map<string, RateLimitEntry> = new Map();
  private readonly config: Required<PasswordResetRateLimiterConfig>;

  constructor(config: Partial<PasswordResetRateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Verifica se a chave (IP) excedeu o limite de tentativas.
   * Incrementa o contador se dentro do limite.
   * Janela deslizante de 1 hora a partir da primeira tentativa (REQ-17).
   *
   * Rastreabilidade: REQ-16 · REQ-17 · NFR-5
   */
  async check(key: string): Promise<RateLimitCheckResult> {
    const now = this.config.now();
    const entry = this.store.get(key);

    // Sem entrada anterior ou janela expirada: nova janela
    if (!entry || now - entry.firstAttemptAt >= this.config.windowMs) {
      this.store.set(key, { count: 1, firstAttemptAt: now });
      return {
        allowed: true,
        remaining: this.config.maxAttempts - 1,
        resetAt: new Date(now + this.config.windowMs),
      };
    }

    // Limite excedido
    if (entry.count >= this.config.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.firstAttemptAt + this.config.windowMs),
      };
    }

    // Dentro da janela e abaixo do limite: incrementar
    entry.count += 1;
    const remaining = this.config.maxAttempts - entry.count;

    return {
      allowed: true,
      remaining: remaining >= 0 ? remaining : 0,
      resetAt: new Date(entry.firstAttemptAt + this.config.windowMs),
    };
  }

  /**
   * Reseta o contador da chave fornecida (util em testes).
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /** Limpa todos os contadores. */
  resetAll(): void {
    this.store.clear();
  }
}

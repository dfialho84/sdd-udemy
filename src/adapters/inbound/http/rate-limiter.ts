// RateLimiter — middleware de transporte inbound
// Controla tentativas por IP com contadores em memória (Map + TTL manual).
// Baseado na decisão técnica DT-3: sem Redis, armazenamento em processo Next.js.
// Rastreabilidade: T-49 · NFR-4

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export interface RateLimiterConfig {
  /** Número máximo de tentativas permitidas na janela (default: 3) */
  maxAttempts: number;
  /** Duração da janela em milissegundos (default: 15 minutos) */
  windowMs: number;
  /** Função de tempo — substituível em testes (default: Date.now) */
  now?: () => number;
}

const DEFAULT_CONFIG: Required<RateLimiterConfig> = {
  maxAttempts: 3,
  windowMs: 15 * 60 * 1000, // 15 minutos
  now: Date.now,
};

/**
 * Verifica se o IP atingiu o limite de tentativas.
 * Retorna true se a requisição deve ser BLOQUEADA (HTTP 429).
 * Retorna false se a requisição deve ser PERMITIDA.
 *
 * Cada chamada bem-sucedida (não bloqueada) incrementa o contador.
 * O contador expira automaticamente após windowMs.
 */
export class RateLimiter {
  private readonly store: Map<string, RateLimitEntry> = new Map();
  private readonly config: Required<RateLimiterConfig>;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Verifica e registra uma tentativa do IP fornecido.
   * @returns true se o IP deve ser BLOQUEADO (limite excedido), false se permitido
   */
  check(ip: string): boolean {
    const now = this.config.now();
    const entry = this.store.get(ip);

    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      // Primeira tentativa ou janela expirada: iniciar nova janela
      this.store.set(ip, { count: 1, windowStart: now });
      return false; // permitido
    }

    if (entry.count >= this.config.maxAttempts) {
      // Limite excedido — bloquear sem incrementar
      return true; // bloqueado
    }

    // Dentro da janela e abaixo do limite: incrementar
    entry.count += 1;
    return false; // permitido
  }

  /**
   * Reseta o contador do IP fornecido.
   * Útil para teardown entre testes.
   */
  reset(ip: string): void {
    this.store.delete(ip);
  }

  /** Limpa todos os contadores. */
  resetAll(): void {
    this.store.clear();
  }
}

/**
 * Instância singleton do RateLimiter para uso no handler de registro.
 * O singleton é compartilhado entre requisições no mesmo processo Next.js (DT-3).
 */
const globalForRateLimiter = globalThis as unknown as {
  registerRateLimiter: RateLimiter;
};

export const registerRateLimiter =
  globalForRateLimiter.registerRateLimiter ?? new RateLimiter();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimiter.registerRateLimiter = registerRateLimiter;
}

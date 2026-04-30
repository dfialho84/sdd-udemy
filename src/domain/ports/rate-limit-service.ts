// Port outbound — IRateLimitService
// Contrato para verificacao e registro de tentativas por chave (ex: IP).
// Rastreabilidade: T-16 · REQ-16

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface IRateLimitService {
  /**
   * Verifica se a chave (ex: IP) excedeu o limite de tentativas configurado.
   * Incrementa o contador se a chave ainda estiver dentro do limite.
   * Retorna o estado atual: permitido, tentativas restantes e momento de reset.
   * Rastreabilidade: REQ-16
   */
  check(key: string): Promise<RateLimitCheckResult>;
}

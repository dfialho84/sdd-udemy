// Port outbound — LoginAttemptRepository
// Interface do Domain para persistencia de tentativas de autenticacao e bloqueios.
// Sem importacoes de Drizzle, Next.js ou React (constitution.md regras 13, 16, 18).
// Rastreabilidade: T-25 · REQ-8 · REQ-9 · REQ-12 · REQ-13

import type { LoginAttempt, LoginBlock } from "@/domain/entities/login-attempt";

export interface LoginAttemptRepository {
  /**
   * Persiste uma tentativa de autenticacao (bem-sucedida ou fracassada).
   * Obrigatorio para toda tentativa, independente do resultado (REQ-13).
   *
   * @param attempt - dados da tentativa: identifier, success, created_at
   */
  save(attempt: Omit<LoginAttempt, "id">): Promise<void>;

  /**
   * Conta tentativas fracassadas para um identificador dentro de uma janela deslizante.
   * Usado para decidir se deve ativar bloqueio (REQ-8, NFR-3).
   *
   * @param identifier - username ou email do identificador
   * @param windowMinutes - tamanho da janela em minutos (ex: 10)
   * @returns numero de tentativas fracassadas na janela
   */
  countRecentFailures(identifier: string, windowMinutes: number): Promise<number>;

  /**
   * Retorna o bloqueio ativo para um identificador, se houver.
   * Um bloqueio e considerado ativo quando blocked_until > now.
   * Retorna null se nao houver bloqueio ou se o bloqueio ja expirou.
   *
   * @param identifier - username ou email do identificador
   * @returns LoginBlock ativo ou null
   */
  findActiveBlock(identifier: string): Promise<LoginBlock | null>;

  /**
   * Cria um novo bloqueio para o identificador com a data de expiracao informada.
   * Chamado quando failureCount >= 3 em 10 minutos (REQ-9).
   *
   * @param identifier - username ou email do identificador a ser bloqueado
   * @param blockedUntil - timestamp de expiracao do bloqueio (now + 15 min)
   */
  createBlock(identifier: string, blockedUntil: Date): Promise<void>;

  /**
   * Remove o registro de bloqueio do identificador.
   * Chamado quando o bloqueio expirou e o usuario tenta autenticar novamente (REQ-12).
   *
   * @param identifier - username ou email do identificador
   */
  removeBlock(identifier: string): Promise<void>;

  /**
   * Remove os registros de tentativas fracassadas do identificador,
   * zerando o contador efetivo da janela deslizante (REQ-12).
   *
   * @param identifier - username ou email do identificador
   */
  resetFailureCount(identifier: string): Promise<void>;
}

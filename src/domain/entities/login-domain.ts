// LoginDomain — regras de negocio puras para autenticacao e controle de bloqueio
// Sem dependencias externas — logica pura testavel sem mocks (constitution.md regra 1).
// Rastreabilidade: T-31 · T-51 · REQ-8 · REQ-9 · REQ-11 · REQ-12 · REQ-14

import type { LoginBlock } from "./login-attempt";

/** Duracao do bloqueio em minutos (REQ-9, NFR-4) */
const BLOCK_DURATION_MINUTES = 15;

/** Limite de tentativas fracassadas antes do bloqueio (REQ-8, NFR-3) */
const MAX_FAILURES_BEFORE_BLOCK = 3;

export class LoginDomain {
  /**
   * Verifica se um bloqueio esta ativo (blocked_until > now).
   * Retorna false quando block e null (sem bloqueio registrado).
   * Rastreabilidade: T-31 · T-33 · REQ-9 · REQ-11 · REQ-12
   */
  isBlocked(block: LoginBlock | null): boolean {
    if (block === null) return false;
    return block.blocked_until > new Date();
  }

  /**
   * Decide se deve ativar bloqueio com base na contagem de falhas recentes.
   * Ativa quando failureCount >= 3 (REQ-8, NFR-3).
   * Rastreabilidade: T-31 · T-34 · REQ-8 · NFR-3
   */
  shouldActivateBlock(failureCount: number): boolean {
    return failureCount >= MAX_FAILURES_BEFORE_BLOCK;
  }

  /**
   * Calcula a data de expiracao do bloqueio: from + 15 minutos (REQ-9, NFR-4).
   * Rastreabilidade: T-31 · T-35 · REQ-9 · NFR-4
   */
  calculateBlockExpiration(from: Date): Date {
    return new Date(from.getTime() + BLOCK_DURATION_MINUTES * 60 * 1000);
  }

  /**
   * Decide se deve enviar email de aviso de tentativa com senha incorreta.
   * Envia somente quando conta existe E senha esta incorreta (REQ-14, NFR-8).
   * Rastreabilidade: T-51 · REQ-14 · NFR-8
   */
  shouldSendEmailWarning(userExists: boolean, passwordCorrect: boolean): boolean {
    return userExists && !passwordCorrect;
  }
}

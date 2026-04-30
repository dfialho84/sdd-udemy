// Port outbound — AuditLogger
// Registro estruturado de operacoes de auditoria.
// Rastreabilidade: T-20 · NFR-6 · REQ-16

export type AuditEventType =
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_EMAIL_NOT_FOUND"
  | "PASSWORD_RESET_RATE_LIMIT_BLOCKED"
  | "PASSWORD_RESET_COMPLETED";

export interface AuditEvent {
  type: AuditEventType;
  timestamp: Date;
  ip?: string;
  userId?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogger {
  /**
   * Registra um evento de auditoria com log estruturado (JSON).
   * Token em texto plano nunca deve aparecer nos logs (NFR-3).
   * Rastreabilidade: NFR-6
   */
  log(event: AuditEvent): Promise<void>;
}

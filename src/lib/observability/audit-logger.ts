// AuditLogger — adapter de infraestrutura para registro estruturado de auditoria
// Implementa AuditLogger (domain port) usando pino para log estruturado.
// Token em texto plano nunca deve aparecer nos logs (NFR-3).
// Logs devem ser retidos por minimo 1 ano (NFR-6).
// Rastreabilidade: T-20 · NFR-6 · REQ-16

import { logger } from "./logger";
import type { AuditLogger as IAuditLogger, AuditEvent } from "@/domain/ports/audit-logger";

export class AuditLogger implements IAuditLogger {
  /**
   * Registra um evento de auditoria em formato JSON estruturado.
   * O campo token nunca deve estar presente nos logs (NFR-3).
   * Rastreabilidade: NFR-6
   */
  async log(event: AuditEvent): Promise<void> {
    const logEntry = {
      tipoEvento: event.type,
      timestamp: event.timestamp.toISOString(),
      ip: event.ip,
      userId: event.userId,
      email: event.email,
      ...(event.metadata ? { metadata: event.metadata } : {}),
    };

    logger.info(logEntry, `Audit: ${event.type}`);
  }
}

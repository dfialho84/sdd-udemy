// RequestPasswordResetUseCase — camada application (Domain)
// Orquestra o fluxo de solicitacao de recuperacao de senha:
// verificar email, gerar token com expiracao de 12h, persistir hash, disparar email.
// Anti-enumeracao: resposta identica para email existente e inexistente (REQ-14).
// Rastreabilidade: T-07 · REQ-4 · REQ-5 · REQ-14 · REQ-2 · NFR-3

import { randomBytes } from "node:crypto";
import { createHash } from "node:crypto";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { IEmailService } from "@/domain/ports/password-reset-email-service";
import type { AuditLogger } from "@/domain/ports/audit-logger";

// ─── Output ──────────────────────────────────────────────────────────

export interface RequestPasswordResetOutput {
  message: string;
}

// ─── Dependencias ─────────────────────────────────────────────────────

export interface RequestPasswordResetUseCaseDeps {
  userRepository: UserRepository;
  passwordResetTokenRepository: IPasswordResetTokenRepository;
  emailService: IEmailService;
  auditLogger: AuditLogger;
}

// ─── Use Case ─────────────────────────────────────────────────────────

export class RequestPasswordResetUseCase {
  private readonly deps: RequestPasswordResetUseCaseDeps;

  constructor(deps: RequestPasswordResetUseCaseDeps) {
    this.deps = deps;
  }

  async execute(email: string): Promise<RequestPasswordResetOutput> {
    const { userRepository, passwordResetTokenRepository, emailService, auditLogger } = this.deps;
    const now = new Date();

    // Busca usuario pelo email
    const user = await userRepository.findByEmail(email);

    if (user !== null && user.isActive()) {
      // Email existe e conta ativa — gerar token (REQ-4)
      const plainToken = randomBytes(32).toString("hex"); // 64 hex chars, 256 bits
      const tokenHash = createHash("sha256").update(plainToken).digest("hex");
      const expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000); // now + 12h

      await passwordResetTokenRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Disparo de email assincrono fire-and-forget (DT-3)
      emailService.sendPasswordReset(email, plainToken).catch((err: unknown) => {
        auditLogger.log({
          type: "PASSWORD_RESET_REQUESTED",
          timestamp: new Date(),
          userId: user.id,
          email,
          metadata: {
            error: err instanceof Error ? err.message : String(err),
            context: "fire-and-forget email send failed",
          },
        });
      });

      // Registro de auditoria (NFR-6)
      await auditLogger.log({
        type: "PASSWORD_RESET_REQUESTED",
        timestamp: now,
        userId: user.id,
        email,
      });
    } else {
      // Email nao encontrado ou conta inativa — anti-enumeracao (REQ-14)
      // Nao gera token, nao envia email — mesma resposta
      await auditLogger.log({
        type: "PASSWORD_RESET_EMAIL_NOT_FOUND",
        timestamp: now,
        email,
      });
    }

    // Mensagem generica em ambos os casos (REQ-2, REQ-14)
    return {
      message:
        "Se existe conta com esse email, voce recebera um link de recuperacao",
    };
  }
}

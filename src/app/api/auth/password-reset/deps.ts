// Dependency injection para POST /api/auth/password-reset (request)
// Rastreabilidade: T-18

import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import { PasswordResetTokenRepositoryDrizzle } from "@/adapters/outbound/persistence/drizzle-password-reset-token-repository";
import { PasswordResetEmailAdapter } from "@/adapters/outbound/email/password-reset-email-adapter";
import { PasswordResetRateLimiter } from "@/adapters/inbound/http/password-reset-rate-limiter";
import { RequestPasswordResetUseCase } from "@/application/use-cases/request-password-reset.use-case";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { IEmailService } from "@/domain/ports/password-reset-email-service";
import type { IRateLimitService } from "@/domain/ports/rate-limit-service";
import type { AuditLogger } from "@/domain/ports/audit-logger";

interface RequestDeps {
  userRepository: UserRepository;
  passwordResetTokenRepository: IPasswordResetTokenRepository;
  emailService: IEmailService;
  auditLogger: AuditLogger;
}

let depsFactory: () => RequestDeps = () => ({
  userRepository: new DrizzleUserRepository(),
  passwordResetTokenRepository: new PasswordResetTokenRepositoryDrizzle(),
  emailService: new PasswordResetEmailAdapter(),
  auditLogger: {
    log: async (event) => {
      console.log(JSON.stringify({ tipoEvento: event.type, ...event }));
    },
  },
});

export function buildRequestPasswordResetUseCase(): RequestPasswordResetUseCase {
  const deps = depsFactory();
  return new RequestPasswordResetUseCase({
    userRepository: deps.userRepository,
    passwordResetTokenRepository: deps.passwordResetTokenRepository,
    emailService: deps.emailService,
    auditLogger: deps.auditLogger,
  });
}

let rateLimiterInstance: IRateLimitService | null = null;

export function getRateLimiter(): IRateLimitService {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new PasswordResetRateLimiter();
  }
  return rateLimiterInstance;
}

export function resetRateLimiter(): void {
  if (rateLimiterInstance instanceof PasswordResetRateLimiter) {
    rateLimiterInstance.resetAll();
  }
}

export function setDepsFactory(factory: () => RequestDeps): void {
  depsFactory = factory;
}

export function resetDepsFactory(): void {
  depsFactory = () => ({
    userRepository: new DrizzleUserRepository(),
    passwordResetTokenRepository: new PasswordResetTokenRepositoryDrizzle(),
    emailService: new PasswordResetEmailAdapter(),
    auditLogger: {
      log: async (event) => {
        console.log(JSON.stringify({ tipoEvento: event.type, ...event }));
      },
    },
  });
}

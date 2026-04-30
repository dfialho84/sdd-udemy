// Dependency injection para POST /api/auth/password-reset/confirm
// Rastreabilidade: T-13 · T-19

import { PasswordResetTokenRepositoryDrizzle } from "@/adapters/outbound/persistence/drizzle-password-reset-token-repository";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import { Argon2PasswordHasher } from "@/adapters/outbound/persistence/argon2-password-hasher";
import { ResetPasswordUseCase } from "@/application/use-cases/reset-password.use-case";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { AuditLogger } from "@/domain/ports/audit-logger";

interface ConfirmDeps {
  passwordResetTokenRepository: IPasswordResetTokenRepository;
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  auditLogger: AuditLogger;
}

let depsFactory: () => ConfirmDeps = () => ({
  passwordResetTokenRepository: new PasswordResetTokenRepositoryDrizzle(),
  userRepository: new DrizzleUserRepository(),
  passwordHasher: new Argon2PasswordHasher(),
  auditLogger: {
    log: async (event) => {
      console.log(JSON.stringify({ tipoEvento: event.type, ...event }));
    },
  },
});

export function buildResetPasswordUseCase(): ResetPasswordUseCase {
  const deps = depsFactory();
  return new ResetPasswordUseCase(
    deps.passwordResetTokenRepository,
    deps.userRepository,
    deps.passwordHasher,
    deps.auditLogger,
  );
}

export function setDepsFactory(factory: () => ConfirmDeps): void {
  depsFactory = factory;
}

export function resetDepsFactory(): void {
  depsFactory = () => ({
    passwordResetTokenRepository: new PasswordResetTokenRepositoryDrizzle(),
    userRepository: new DrizzleUserRepository(),
    passwordHasher: new Argon2PasswordHasher(),
    auditLogger: {
      log: async (event) => {
        console.log(JSON.stringify({ tipoEvento: event.type, ...event }));
      },
    },
  });
}

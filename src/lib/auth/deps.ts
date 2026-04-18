// Fabrica de dependencias do AuthenticateUserUseCase para o authorize callback do next-auth.
// Separada do config.ts para permitir substituicao em testes.
// Rastreabilidade: T-13 · REQ-3 · REQ-6

import { logger } from "@/lib/observability/logger";
import { DrizzleLoginUserRepository } from "@/adapters/outbound/persistence/drizzle-login-user-repository";
import { Argon2PasswordVerifier } from "@/adapters/outbound/persistence/argon2-password-verifier";
import { DrizzleLoginAttemptRepository } from "@/adapters/outbound/persistence/drizzle-login-attempt-repository";
import { LoginEmailNotificationAdapter } from "@/adapters/outbound/email/login-email-notification-adapter";
import type { AuthenticateUserUseCaseDeps } from "@/application/use-cases/authenticate-user.use-case";

/**
 * Monta as dependencias concretas do AuthenticateUserUseCase para uso em producao.
 * Rastreabilidade: T-27 · T-28 · T-29 · T-30 · T-42 · T-43
 */
export function buildAuthDeps(): AuthenticateUserUseCaseDeps {
  return {
    userRepository: new DrizzleLoginUserRepository(),
    passwordVerifier: new Argon2PasswordVerifier(),
    loginAttemptRepository: new DrizzleLoginAttemptRepository(),
    emailNotificationPort: new LoginEmailNotificationAdapter(),
    logger,
  };
}

/**
 * Fabrica substituivel em testes — substitua via setAuthDepsFactory() em testes de integracao.
 */
let authDepsFactory: () => AuthenticateUserUseCaseDeps = buildAuthDeps;

/** Substitui a fabrica de dependencias — use apenas em testes. */
export function setAuthDepsFactory(factory: () => AuthenticateUserUseCaseDeps): void {
  authDepsFactory = factory;
}

/** Restaura a fabrica padrao de dependencias. */
export function resetAuthDepsFactory(): void {
  authDepsFactory = buildAuthDeps;
}

/** Retorna a fabrica atual de dependencias (usada pelo authorize callback). */
export function getAuthDepsFactory(): () => AuthenticateUserUseCaseDeps {
  return authDepsFactory;
}

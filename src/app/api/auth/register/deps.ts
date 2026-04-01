// Fábrica de dependências do RegisterUserUseCase — separada do route.ts para
// evitar conflito com as restrições de exportação do Next.js App Router.
// Rastreabilidade: T-20 · T-21 · DT-2 · DT-3

import { logger } from "@/lib/observability/logger";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import { DrizzleConfirmationTokenRepository } from "@/adapters/outbound/persistence/drizzle-confirmation-token-repository";
import { Argon2PasswordHasher } from "@/adapters/outbound/persistence/argon2-password-hasher";
import { CryptoTokenGenerator } from "@/adapters/outbound/persistence/crypto-token-generator";
import { MailhogEmailAdapter } from "@/adapters/outbound/email/mailhog-email-adapter";
import type { RegisterUserUseCaseDeps } from "@/application/use-cases/register-user.use-case";

/**
 * Monta as dependências concretas do RegisterUserUseCase para uso em produção.
 * Exportada para permitir substituição em testes de integração.
 */
export function buildUseCaseDeps(): RegisterUserUseCaseDeps {
  return {
    userRepository: new DrizzleUserRepository(),
    confirmationTokenRepository: new DrizzleConfirmationTokenRepository(),
    passwordHasher: new Argon2PasswordHasher(),
    tokenGenerator: new CryptoTokenGenerator(),
    emailService: new MailhogEmailAdapter(),
    appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
    logger,
  };
}

/**
 * Fábrica de dependências substituível em testes de integração.
 * Em produção usa buildUseCaseDeps(); testes substituem via setDepsFactory().
 */
let depsFactory: () => RegisterUserUseCaseDeps = buildUseCaseDeps;

/** Substitui a fábrica de dependências — use apenas em testes de integração. */
export function setDepsFactory(factory: () => RegisterUserUseCaseDeps): void {
  depsFactory = factory;
}

/** Restaura a fábrica padrão de dependências. */
export function resetDepsFactory(): void {
  depsFactory = buildUseCaseDeps;
}

/** Retorna a fábrica atual de dependências (usada pelo handler). */
export function getDepsFactory(): () => RegisterUserUseCaseDeps {
  return depsFactory;
}

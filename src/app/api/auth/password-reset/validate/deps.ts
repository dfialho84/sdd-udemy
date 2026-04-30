// Dependency injection para GET /api/auth/password-reset/validate
// Rastreabilidade: T-11

import { PasswordResetTokenRepositoryDrizzle } from "@/adapters/outbound/persistence/drizzle-password-reset-token-repository";
import { ValidateResetTokenUseCase } from "@/application/use-cases/validate-reset-token.use-case";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";

interface ValidateDeps {
  passwordResetTokenRepository: IPasswordResetTokenRepository;
}

let depsFactory: () => ValidateDeps = () => ({
  passwordResetTokenRepository: new PasswordResetTokenRepositoryDrizzle(),
});

export function buildValidateUseCase(): ValidateResetTokenUseCase {
  const deps = depsFactory();
  return new ValidateResetTokenUseCase(deps.passwordResetTokenRepository);
}

export function setDepsFactory(factory: () => ValidateDeps): void {
  depsFactory = factory;
}

export function resetDepsFactory(): void {
  depsFactory = () => ({
    passwordResetTokenRepository: new PasswordResetTokenRepositoryDrizzle(),
  });
}

// Depended injection para ConfirmAccountHandler (T-39)
// Permite mock das dependências nos testes unitários.

import { DrizzleConfirmationTokenRepository } from "@/adapters/outbound/persistence/drizzle-confirmation-token-repository";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import type { ConfirmAccountUseCaseDeps } from "@/application/use-cases/confirm-account.use-case";

let depsFactory: () => ConfirmAccountUseCaseDeps = () => ({
  confirmationTokenRepository: new DrizzleConfirmationTokenRepository(),
  userRepository: new DrizzleUserRepository(),
  appBaseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL || "https://app.example.com",
  logger: {
    info: (obj: object, msg?: string) => {
      console.log(JSON.stringify({ tipoEvento: "confirmacao_sucesso", ...obj }), msg);
    },
    error: (obj: object, msg?: string) => {
      console.error(JSON.stringify({ tipoEvento: "confirmacao_falha", ...obj }), msg);
    },
  },
});

export const getDeps = (): ConfirmAccountUseCaseDeps => depsFactory();

export const setDepsFactory = (factory: () => ConfirmAccountUseCaseDeps): void => {
  depsFactory = factory;
};

export const resetDepsFactory = (): void => {
  depsFactory = () => ({
    confirmationTokenRepository: new DrizzleConfirmationTokenRepository(),
    userRepository: new DrizzleUserRepository(),
    appBaseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL || "https://app.example.com",
    logger: {
      info: (obj: object, msg?: string) => {
        console.log(JSON.stringify({ tipoEvento: "confirmacao_sucesso", ...obj }), msg);
      },
      error: (obj: object, msg?: string) => {
        console.error(JSON.stringify({ tipoEvento: "confirmacao_falha", ...obj }), msg);
      },
    },
  });
};

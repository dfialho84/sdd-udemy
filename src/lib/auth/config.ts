// NextAuth config completo — base config + Credentials provider.
// Usado apenas pela API route (src/lib/auth/index.ts), NUNCA pelo middleware.
// A separacao evita que o middleware carregue argon2 → node:crypto (incompativel com Webpack).
// Rastreabilidade: T-13 · T-15 · REQ-3 · REQ-4 · REQ-6

import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { CredentialsSignin } from "next-auth";
import { AuthenticationError, AccountBlockedError } from "@/application/use-cases/authenticate-user.use-case";
import { authorizeCredentials } from "./authorize";
import { getAuthDepsFactory } from "./deps";
import { baseAuthConfig } from "./config.base";

export const authConfig: NextAuthConfig = {
  ...baseAuthConfig,

  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Identificador", type: "text" },
        password: { label: "Senha", type: "password" },
      },

      async authorize(credentials) {
        try {
          return await authorizeCredentials(
            credentials as Record<string, unknown>,
            getAuthDepsFactory(),
          );
        } catch (err) {
          if (err instanceof AccountBlockedError) {
            const blockedError = new CredentialsSignin(
              "Muitas tentativas fracassadas. Tente novamente em 15 minutos",
            );
            blockedError.code = "account_blocked";
            throw blockedError;
          }
          if (err instanceof AuthenticationError) {
            return null;
          }
          throw err;
        }
      },
    }),
  ],
};

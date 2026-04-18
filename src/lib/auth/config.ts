// NextAuth config — NextAuthSessionAdapter + authorize callback (Credentials provider)
// Adapter fino: valida payload via Zod, delega ao AuthenticateUserUseCase, retorna user ou null.
// Nenhuma regra de negocio neste arquivo (constitution.md regras 1, 3, 16).
// Rastreabilidade: T-13 · T-15 · REQ-3 · REQ-4 · REQ-6

import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { randomUUID } from "crypto";
import { loginPayloadSchema } from "@/lib/validation/login-payload.schema";
import {
  AuthenticateUserUseCase,
  AuthenticationError,
  AccountBlockedError,
} from "@/application/use-cases/authenticate-user.use-case";
import { getAuthDepsFactory } from "./deps";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Identificador", type: "text" },
        password: { label: "Senha", type: "password" },
      },

      /**
       * Authorize callback — adapter fino entre next-auth e AuthenticateUserUseCase.
       * Responsabilidades:
       * 1. Validar que identifier e password nao sao vazios via Zod (REQ-6, constitution.md regra 4)
       * 2. Delegar integralmente ao AuthenticateUserUseCase via Port (constitution.md regra 3)
       * 3. Retornar objeto de usuario para o next-auth criar a sessao (REQ-3)
       * 4. Retornar null em caso de falha (next-auth produzira 401)
       */
      async authorize(credentials) {
        const requestId = randomUUID();

        // 1. Validacao de entrada na borda do sistema (constitution.md regra 4)
        const parsed = loginPayloadSchema.safeParse(credentials);
        if (!parsed.success) {
          // identifier vazio ou password vazio — rejeita sem chamar o Domain (REQ-6)
          return null;
        }

        const { identifier, password } = parsed.data;

        // 2. Delegar ao AuthenticateUserUseCase (constitution.md regra 3)
        const useCase = new AuthenticateUserUseCase(getAuthDepsFactory()());

        try {
          const result = await useCase.execute({ identifier, password, requestId });

          // 3. Retornar objeto de usuario para o next-auth (REQ-3)
          return {
            id: result.id,
            name: result.username,
            email: result.email,
          };
        } catch (err) {
          if (err instanceof AuthenticationError || err instanceof AccountBlockedError) {
            // Propaga o erro como string para o next-auth repassar ao cliente (REQ-5, REQ-10)
            // next-auth expoe a mensagem via query param ?error= na pagina de login
            throw err;
          }
          // Erro inesperado — relanca para nao silenciar (constitution.md regra 17)
          throw err;
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      if (isOnDashboard) return isLoggedIn;
      return true;
    },

    /**
     * Callback jwt — persiste o id do usuario no token para que o session callback
     * possa expor o id na sessao (necessario para REQ-4: redirecionar para /users/<id>).
     */
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },

    /**
     * Callback session — expoe o id do usuario na sessao do cliente.
     */
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    /**
     * Callback redirect — redireciona o usuario autenticado para /users/<id> (REQ-4, NFR-2).
     * O id e lido do token de sessao persistido pelo jwt callback.
     * Chamado pelo next-auth apos autenticacao bem-sucedida.
     */
    async redirect({ url, baseUrl }) {
      // Se a URL de retorno e relativa (ex: /users/xxx), usa como esta
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Se e do mesmo dominio, permite o redirect
      if (new URL(url).origin === baseUrl) return url;
      // Fallback: usa a baseUrl
      return baseUrl;
    },
  },
};

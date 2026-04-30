// NextAuth base config — callbacks e pages compartilhados entre middleware e API routes.
// SEM imports de providers, deps, argon2 ou node:crypto.
// Usado pelo middleware.ts que NÃO deve carregar argon2.
// Rastreabilidade: T-13 · REQ-4

import type { NextAuthConfig } from "next-auth";

export const baseAuthConfig = {
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

    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },

    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
} satisfies Omit<NextAuthConfig, "providers">;

import NextAuth from "next-auth";
import { baseAuthConfig } from "@/lib/auth/config.base";

export default NextAuth({
  ...baseAuthConfig,
  providers: [], // middleware nao precisa de providers — apenas verifica sessao JWT
}).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

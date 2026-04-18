// LoginRouteHandler — GET e POST /api/auth/[...nextauth]
// Adapter de transporte inbound gerenciado pelo next-auth v5.
// Exporta os handlers GET e POST do next-auth para o App Router do Next.js.
// Toda logica de autenticacao esta no authorize callback em src/lib/auth/config.ts.
// Rastreabilidade: T-14 · REQ-3 · REQ-5 · REQ-10

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

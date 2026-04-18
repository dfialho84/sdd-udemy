// authorize — logica do authorize callback extraida para modulo puro testavel
// Sem importacoes de next-auth — apenas Domain, Ports e schema Zod.
// Isso permite teste unitario sem ESM de next-auth (constitution.md regra 4).
// Rastreabilidade: T-21 · T-22 · REQ-6 · NFR-6

import { randomUUID } from "crypto";
import { loginPayloadSchema } from "@/lib/validation/login-payload.schema";
import {
  AuthenticateUserUseCase,
  type AuthenticateUserUseCaseDeps,
} from "@/application/use-cases/authenticate-user.use-case";

export interface AuthorizeResult {
  id: string;
  name: string;
  email: string;
}

/**
 * Logica pura do authorize callback — testavel sem next-auth.
 *
 * Responsabilidades:
 * 1. Validar que identifier e password nao sao vazios via Zod (REQ-6, constitution.md regra 4)
 * 2. Delegar ao AuthenticateUserUseCase (constitution.md regra 3)
 * 3. Retornar objeto de usuario ou null
 *
 * @returns objeto de usuario para o next-auth, ou null se credenciais invalidas
 */
export async function authorizeCredentials(
  credentials: Record<string, unknown> | undefined,
  getDeps: () => AuthenticateUserUseCaseDeps,
): Promise<AuthorizeResult | null> {
  const requestId = randomUUID();

  // 1. Validacao de entrada na borda do sistema (constitution.md regra 4)
  const parsed = loginPayloadSchema.safeParse(credentials);
  if (!parsed.success) {
    // identifier vazio, ausente ou password vazio — rejeita sem chamar o Domain (REQ-6)
    return null;
  }

  const { identifier, password } = parsed.data;

  // 2. Delegar ao AuthenticateUserUseCase (constitution.md regra 3)
  const useCase = new AuthenticateUserUseCase(getDeps());
  const result = await useCase.execute({ identifier, password, requestId });

  // 3. Retornar objeto para o next-auth criar a sessao (REQ-3)
  return {
    id: result.id,
    name: result.username,
    email: result.email,
  };
}

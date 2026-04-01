// Route Handler — POST /api/auth/register
// Adapter de transporte inbound: aplica rate limiting, valida entrada e delega ao RegisterUserUseCase.
// Rastreabilidade: T-20 · T-04 · T-07 · REQ-1 · REQ-2 · REQ-3 · REQ-7 · REQ-8 · REQ-9 · NFR-4

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { registerUserSchema } from "@/lib/validation/register-user.schema";
import {
  RegisterUserUseCase,
  RegisterUserUseCaseError,
} from "@/application/use-cases/register-user.use-case";
import { logger } from "@/lib/observability/logger";
import { registerRateLimiter } from "@/adapters/inbound/http/rate-limiter";
import { getDepsFactory } from "./deps";

/** Estrutura padronizada de erro (constitution.md, regra 5) */
interface ErrorResponse {
  codigo: number;
  mensagem: string;
  requestId: string;
  timestamp: string;
}

function errorResponse(
  codigo: number,
  mensagem: string,
  requestId: string,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { codigo, mensagem, requestId, timestamp: new Date().toISOString() },
    { status: codigo },
  );
}

/**
 * Extrai o IP do cliente da requisição para uso no rate limiting.
 * Usa x-forwarded-for se disponível (proxy/load balancer), senão fallback para "unknown".
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();

  // --- Rate limiting (NFR-4 · DT-3) ---
  const ip = getClientIp(request);
  const blocked = registerRateLimiter.check(ip);
  if (blocked) {
    return errorResponse(
      429,
      "Muitas tentativas de cadastro. Tente novamente em 15 minutos.",
      requestId,
    );
  }

  // --- Validação de entrada (constitution.md, regra 4) ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "O corpo da requisição deve ser um JSON válido.", requestId);
  }

  const parsed = registerUserSchema.safeParse(body);

  if (!parsed.success) {
    // Extrai a primeira mensagem de erro para identificar o campo faltante (REQ-2)
    const firstError = parsed.error.issues[0];
    const mensagem = firstError?.message ?? "Dados de entrada inválidos.";
    return errorResponse(400, mensagem, requestId);
  }

  // --- Delegar ao RegisterUserUseCase ---
  const useCase = new RegisterUserUseCase(getDepsFactory()());

  try {
    const result = await useCase.execute({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      birthDate: new Date(parsed.data.birthDate),
      avatarUrl: parsed.data.avatarUrl ?? null,
      requestId,
    });

    return NextResponse.json({ message: result.message }, { status: 200 });
  } catch (err) {
    // Mapear erros de domínio para HTTP (constitution.md, regra 3)
    if (err instanceof RegisterUserUseCaseError) {
      return errorResponse(err.codigo, err.message, requestId);
    }

    // Erro inesperado — logar e retornar 500 (constitution.md, regra 5 e 15)
    logger.error(
      {
        timestamp: new Date().toISOString(),
        requestId,
        tipoEvento: "erro_interno",
        erro: err instanceof Error ? err.message : String(err),
      },
      "Erro interno no RegisterUserHandler",
    );

    return errorResponse(500, "Erro interno do servidor.", requestId);
  }
}

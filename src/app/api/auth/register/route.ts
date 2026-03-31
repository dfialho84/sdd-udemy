// Route Handler — POST /api/auth/register
// Adapter de transporte inbound: valida entrada e delega ao RegisterUserUseCase.
// Rastreabilidade: T-04 · REQ-2 · REQ-7

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { registerUserSchema } from "@/lib/validation/register-user.schema";

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();

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

  // TODO: T-06 — delegar ao RegisterUserUseCase após implementação do caso de uso
  // Por ora, retorna 501 para indicar que o fluxo completo ainda não está implementado.
  return NextResponse.json({ message: "Not implemented yet." }, { status: 501 });
}

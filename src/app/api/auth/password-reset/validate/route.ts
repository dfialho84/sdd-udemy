// Route Handler GET /api/auth/password-reset/validate — adapter HTTP inbound
// Valida token de recuperacao de senha.
// Rastreabilidade: T-11 · REQ-7 · REQ-12 · REQ-13

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  ValidateResetTokenUseCase,
  TokenExpiredError,
  TokenInvalidError,
} from "@/application/use-cases/validate-reset-token.use-case";
import { buildValidateUseCase } from "./deps";

/** Estrutura padronizada de erro (constitution.md, regra 5) */
interface ErrorResponse {
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
}

const MIN_TOKEN_LENGTH = 32;

function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { code, message, requestId, timestamp: new Date().toISOString() },
    { status },
  );
}

/**
 * GET /api/auth/password-reset/validate?token=<token>
 *
 * Valida o token de recuperacao:
 * - 200: token valido -> { valid: true }
 * - 400: token malformado ou ausente -> TOKEN_INVALID
 * - 404: token nao encontrado -> TOKEN_INVALID
 * - 410: token expirado -> TOKEN_EXPIRED
 *
 * Rastreabilidade: REQ-7 · REQ-12 · REQ-13
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  const useCase: ValidateResetTokenUseCase = buildValidateUseCase();

  try {
    // Extrair token da query string
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    // Validacao basica de formato no adapter HTTP inbound (constitution.md regra 4)
    if (!token || typeof token !== "string" || token.trim() === "" || token.length < MIN_TOKEN_LENGTH) {
      return errorResponse(400, "TOKEN_INVALID", "O link de recuperacao e invalido", requestId);
    }

    // Delegar ao caso de uso
    const result = await useCase.execute(token.trim());

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return errorResponse(410, "TOKEN_EXPIRED", error.message, requestId);
    }
    if (error instanceof TokenInvalidError) {
      return errorResponse(404, "TOKEN_INVALID", error.message, requestId);
    }

    // Erro inesperado
    return errorResponse(500, "INTERNAL_ERROR", "Erro interno do servidor", requestId);
  }
}

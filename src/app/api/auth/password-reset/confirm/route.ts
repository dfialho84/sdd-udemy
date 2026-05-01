// Route Handler POST /api/auth/password-reset/confirm — adapter HTTP inbound
// Redefine a senha do usuario apos validacao do token e das senhas.
// Rastreabilidade: T-13 · T-19 · REQ-8 · REQ-9 · REQ-10 · REQ-11 · REQ-12 · REQ-13

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  ResetPasswordUseCase,
  TokenExpiredError,
  TokenInvalidError,
  TokenAlreadyUsedError,
  WeakPasswordError,
} from "@/application/use-cases/reset-password.use-case";
import { buildResetPasswordUseCase } from "./deps";

// ─── Tipos de erro padronizados (constitution.md regra 5) ─────────────

interface ErrorResponse {
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
}

interface ConfirmBody {
  token?: string;
  password?: string;
  passwordConfirm?: string;
}

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
 * POST /api/auth/password-reset/confirm
 *
 * Body: { token, password, passwordConfirm }
 *
 * Respostas:
 * - 200: { message: "Senha redefinida com sucesso" }
 * - 400: PASSWORDS_MISMATCH (senhas nao coincidem)
 * - 400: WEAK_PASSWORD (senha nao atende criterios)
 * - 404: TOKEN_INVALID (token nao encontrado)
 * - 410: TOKEN_EXPIRED (token expirado)
 *
 * Rastreabilidade: REQ-8 · REQ-9 · REQ-10 · REQ-11 · REQ-12 · REQ-13
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  const useCase: ResetPasswordUseCase = buildResetPasswordUseCase();

  try {
    // Parse do body
    let body: ConfirmBody;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "INVALID_BODY", "O corpo da requisicao deve ser JSON valido", requestId);
    }

    // Validar presenca dos campos obrigatorios
    if (!body.token || typeof body.token !== "string" || body.token.trim() === "") {
      return errorResponse(400, "TOKEN_INVALID", "O link de recuperacao e invalido", requestId);
    }
    if (!body.password || typeof body.password !== "string") {
      return errorResponse(400, "INVALID_BODY", "O campo password e obrigatorio", requestId);
    }
    if (!body.passwordConfirm || typeof body.passwordConfirm !== "string") {
      return errorResponse(400, "INVALID_BODY", "O campo passwordConfirm e obrigatorio", requestId);
    }

    // T-13: Validar coincidencia de senhas no adapter HTTP inbound (constitution.md regra 4)
    // Rastreabilidade: REQ-9
    if (body.password !== body.passwordConfirm) {
      return errorResponse(
        400,
        "PASSWORDS_MISMATCH",
        "As senhas nao coincidem",
        requestId,
      );
    }

    // Delegar ao caso de uso
    await useCase.execute(body.token.trim(), body.password);

    return NextResponse.json(
      { message: "Senha redefinida com sucesso" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof WeakPasswordError) {
      return errorResponse(400, "WEAK_PASSWORD", error.message, requestId);
    }
    if (error instanceof TokenInvalidError) {
      return errorResponse(404, "TOKEN_INVALID", error.message, requestId);
    }
    if (error instanceof TokenAlreadyUsedError) {
      return errorResponse(410, "TOKEN_INVALID", error.message, requestId);
    }

    if (error instanceof TokenExpiredError) {
      return errorResponse(410, "TOKEN_EXPIRED", error.message, requestId);
    }

    // Erro inesperado
    return errorResponse(500, "INTERNAL_ERROR", "Erro interno do servidor", requestId);
  }
}

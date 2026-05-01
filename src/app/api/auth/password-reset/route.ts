// Route Handler POST /api/auth/password-reset — adapter HTTP inbound
// Recebe solicitacao de recuperacao de senha, valida email, aplica rate limit,
// delega ao RequestPasswordResetUseCase e retorna mensagem generica.
// Rastreabilidade: T-18 · REQ-2 · REQ-3 · REQ-15 · REQ-16

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { emailSchema } from "@/lib/validation/email.schema";
import { AuditLogger } from "@/lib/observability/audit-logger";
import { buildRequestPasswordResetUseCase, getRateLimiter } from "./deps";

// ─── Erro padronizado (constitution.md regra 5) ───────────────────────

interface ErrorResponse {
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
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

/** Extrai o IP do cliente da requisicao */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * POST /api/auth/password-reset
 *
 * Body: { email: string }
 *
 * Respostas:
 * - 200: { message: "Se existe conta com esse email, voce recebera um link de recuperacao" }
 * - 400: email com formato invalido
 * - 429: rate limit excedido
 *
 * Rastreabilidade: REQ-2 · REQ-3 · REQ-15 · REQ-16
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();

  try {
    // Parse do body
    let body: { email?: string };
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        400,
        "INVALID_BODY",
        "O corpo da requisicao deve ser JSON valido",
        requestId,
      );
    }

    // Validar formato do email com schema Zod (constitution.md regra 4)
    const parsed = emailSchema.safeParse(body.email);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      const message = firstError?.message ?? "Informe um endereco de email valido";
      return errorResponse(400, "INVALID_EMAIL", message, requestId);
    }

    // Rate limiting por IP (REQ-16 · NFR-5)
    const ip = getClientIp(request);
    const rateLimiter = getRateLimiter();
    const rateCheck = await rateLimiter.check(ip);

    if (!rateCheck.allowed) {
      // Registra bloqueio em log de auditoria (NFR-6)
      const auditLogger = new AuditLogger();
      await auditLogger.log({
        type: "PASSWORD_RESET_RATE_LIMIT_BLOCKED",
        timestamp: new Date(),
        ip,
        metadata: { requestId, reason: "RATE_LIMIT_EXCEEDED" },
      });

      return errorResponse(
        429,
        "RATE_LIMIT_EXCEEDED",
        "Muitas tentativas de recuperacao. Tente novamente em 1 hora",
        requestId,
      );
    }

    // Delegar ao caso de uso
    const useCase = buildRequestPasswordResetUseCase();
    const result = await useCase.execute(parsed.data);

    return NextResponse.json(
      {
        message: result.message,
        linkCadastro: "/register",
      },
      { status: 200 },
    );
  } catch {
    // Erro inesperado
    return errorResponse(500, "INTERNAL_ERROR", "Erro interno do servidor", requestId);
  }
}

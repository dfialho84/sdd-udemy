// Route Handler GET /api/auth/confirm — adapter HTTP inbound
// Rastreabilidade: REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15 · NFR-3 · NFR-7 · T-39

import { NextRequest, NextResponse } from "next/server";
import { ConfirmAccountUseCase, ConfirmAccountUseCaseError } from "@/application/use-cases/confirm-account.use-case";
import { getDeps } from "./deps";

/** Estrutura de erro padronizada (constitution.md, regra 5) */
interface ApiErrorBody {
  codigo: number;
  mensagem: string;
  requestId: string;
  timestamp: string;
}

async function handleConfirm(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Obter dependências injetadas (ou padrão)
  const deps = getDeps();

  // Inicializar caso de uso com dependências injetadas
  const useCase = new ConfirmAccountUseCase(deps);

  try {
    // Extrair token da query string — HTTP 400 se ausente ou malformado (T-39)
    const searchParams = request.nextUrl.searchParams;
    const tokenValue = searchParams.get("token");

    if (!tokenValue || typeof tokenValue !== "string" || tokenValue.trim() === "") {
      throw new ConfirmAccountUseCaseError({
        codigo: 400,
        mensagem: "Parâmetro de token ausente ou inválido.",
      });
    }

    // Delegar ao caso de uso (REQ-10 a REQ-15)
    const result = await useCase.execute(tokenValue.trim());

    // Retornar HTTP 200 com mensagem e URLs (T-39)
    return NextResponse.json({
      message: result.message,
      loginUrl: result.loginUrl,
      registerUrl: result.registerUrl,
    });
  } catch (error) {
    const mappedError: ApiErrorBody = error instanceof ConfirmAccountUseCaseError
      ? {
          codigo: error.codigo,
          mensagem: error.message,
          requestId,
          timestamp,
        }
      : {
          codigo: 500,
          mensagem: "Erro interno do servidor.",
          requestId,
          timestamp,
        };

    return NextResponse.json(mappedError, { status: mappedError.codigo });
  }
}

/** GET /api/auth/confirm?token=xxx */
export async function GET(request: NextRequest) {
  return handleConfirm(request);
}

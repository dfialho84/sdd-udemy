// Route Handler GET /api/auth/confirm — adapter HTTP inbound
// Rastreabilidade: REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15 · NFR-3 · NFR-7 · T-39

import { NextRequest, NextResponse } from "next/server";
import { ConfirmAccountUseCase, ConfirmAccountUseCaseError } from "@/application/use-cases/confirm-account.use-case";
import { getDeps } from "./deps";


async function handleConfirm(request: NextRequest): Promise<NextResponse> {
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
    await useCase.execute(tokenValue.trim());

    // Redirecionar para página HTML de sucesso (HTTP 302 — T-39)
    const url = request.nextUrl.clone();
    url.pathname = "/confirm";
    url.search = "?status=success";
    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    const url = request.nextUrl.clone();
    url.pathname = "/confirm";

    if (error instanceof ConfirmAccountUseCaseError) {
      if (error.codigo === 410) {
        url.search = "?error=expired";
      } else if (error.codigo === 409) {
        url.search = "?error=already_confirmed";
      } else if (error.codigo === 404) {
        url.search = "?error=not_found";
      } else {
        // 400 (token ausente/malformado) e outros → invalid_token
        url.search = "?error=invalid_token";
      }
    } else {
      url.search = "?error=invalid_token";
    }

    return NextResponse.redirect(url, { status: 302 });
  }
}

/** GET /api/auth/confirm?token=xxx */
export async function GET(request: NextRequest) {
  return handleConfirm(request);
}

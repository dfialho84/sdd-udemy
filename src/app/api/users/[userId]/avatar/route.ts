// Route Handler — GET /api/users/[userId]/avatar
// Adapter de transporte inbound: verifica sessão, controla acesso por status do proprietário
// e redireciona para presigned URL do MinIO.
// Rastreabilidade: T-74 · NFR-13 · REQ-2 · DT-9

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { getAvatarAccessDepsFactory } from "./deps";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const requestId = randomUUID();
  const { userId } = await params;

  const deps = getAvatarAccessDepsFactory()();
  const { userRepository, avatarAccessPort, logger } = deps;

  // --- (1) Verificar sessão ativa via next-auth (NFR-13) ---
  const session = await auth();

  if (!session?.user) {
    // Emite log estruturado JSON de rejeição 401 (NFR-13)
    logger.info(
      {
        timestamp: new Date().toISOString(),
        userId: null,
        ownerUserId: userId,
        tipoRejeicao: 401,
        requestId,
      },
      "Acesso não autenticado ao avatar rejeitado",
    );
    return errorResponse(401, "Autenticação necessária.", requestId);
  }

  const requestingUserId = (session.user as { id?: string }).id ?? null;

  // --- (2) Consultar UserRepository.findById (REQ-2) ---
  const owner = await userRepository.findById(userId);

  if (!owner) {
    // Proprietário não encontrado — HTTP 404 sem log de rejeição de segurança
    return errorResponse(404, "Usuário não encontrado.", requestId);
  }

  // --- (3) Verificar status da conta do proprietário (NFR-13) ---
  // Apenas contas com status "active" têm acesso ao avatar.
  // Status "pending" (e quaisquer valores futuros como "inactive"/"blocked") são bloqueados.
  if (!owner.isActive()) {
    // Emite log estruturado JSON de rejeição 403 (NFR-13)
    logger.info(
      {
        timestamp: new Date().toISOString(),
        userId: requestingUserId,
        ownerUserId: userId,
        tipoRejeicao: 403,
        requestId,
      },
      "Acesso ao avatar de conta inativa/bloqueada rejeitado",
    );
    return errorResponse(403, "Acesso negado.", requestId);
  }

  // --- (4) Verificar se avatar_key é não nulo ---
  if (!owner.avatarKey) {
    return errorResponse(404, "Este usuário não possui foto de perfil.", requestId);
  }

  // --- (5) Gerar presigned URL temporária de download (NFR-13 · DT-9) ---
  let presignedUrl: string;
  try {
    presignedUrl = await avatarAccessPort.getPresignedUrl(owner.avatarKey, 60);
  } catch (err) {
    logger.error(
      {
        timestamp: new Date().toISOString(),
        requestId,
        ownerUserId: userId,
        tipoEvento: "erro_presigned_url",
        erro: err instanceof Error ? err.message : String(err),
      },
      "Falha ao gerar presigned URL do avatar",
    );
    return errorResponse(500, "Erro ao gerar URL de acesso ao avatar.", requestId);
  }

  // --- (6) HTTP 302 Redirect para a presigned URL ---
  return NextResponse.redirect(presignedUrl, { status: 302 });
}

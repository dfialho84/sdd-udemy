// Route Handler — POST /api/auth/register
// Adapter de transporte inbound: aplica rate limiting, lê multipart/form-data,
// valida arquivo de avatar (tipo MIME e tamanho), invoca LocalAvatarStorageAdapter
// e delega ao RegisterUserUseCase.
// Rastreabilidade: T-20 · T-04 · T-07 · REQ-1 · REQ-2 · REQ-3 · REQ-7 · REQ-8 · REQ-9 · NFR-4 · DT-6

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

/** Tipos MIME de avatar permitidos (REQ-1 · DT-6) */
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Tamanho máximo de arquivo de avatar: 2 MB */
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

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

  // --- Leitura do corpo como multipart/form-data (REQ-1 · DT-6) ---
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse(400, "O corpo da requisição deve ser multipart/form-data.", requestId);
  }

  // --- Validação do arquivo de avatar, se presente (REQ-1 · DT-6) ---
  let avatarUrl: string | null = null;
  const avatarField = formData.get("avatar");

  if (avatarField !== null && avatarField instanceof File && avatarField.size > 0) {
    const file = avatarField;

    // Valida tipo MIME antes de qualquer processamento (ST-4)
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return errorResponse(
        400,
        "Tipo de arquivo não permitido. Envie uma imagem JPEG, PNG ou WebP.",
        requestId,
      );
    }

    // Valida tamanho máximo (2 MB)
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      return errorResponse(
        400,
        "O arquivo de avatar excede o tamanho máximo permitido de 2 MB.",
        requestId,
      );
    }

    // Persiste o arquivo via AvatarStoragePort (DT-6)
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { avatarStorageAdapter } = getDepsFactory()();
      avatarUrl = await avatarStorageAdapter.save(buffer, file.type);
    } catch (err) {
      logger.error(
        {
          timestamp: new Date().toISOString(),
          requestId,
          tipoEvento: "erro_armazenamento_avatar",
          erro: err instanceof Error ? err.message : String(err),
        },
        "Falha ao armazenar avatar",
      );
      return errorResponse(500, "Erro ao armazenar a foto de perfil.", requestId);
    }
  }

  // --- Extrai campos textuais do formData para validação ---
  const rawData: Record<string, unknown> = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
    birthDate: formData.get("birthDate"),
  };

  // --- Validação dos campos textuais com schema Zod (constitution.md, regra 4) ---
  const parsed = registerUserSchema.safeParse(rawData);

  if (!parsed.success) {
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
      avatarUrl,
      requestId,
    });

    return NextResponse.json({ message: result.message }, { status: 200 });
  } catch (err) {
    // Mapear erros de domínio para HTTP (constitution.md, regra 3)
    if (err instanceof RegisterUserUseCaseError) {
      return errorResponse(err.codigo, err.message, requestId);
    }

    // Erro inesperado — logar e retornar 500 (constitution.md, regras 5 e 15)
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

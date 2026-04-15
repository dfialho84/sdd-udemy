// Route Handler — GET /api/test/find-by-username?username=<valor>
// Endpoint auxiliar de teste de performance — NÃO usar em produção.
// Executa DrizzleUserRepository.findByUsername() e retorna o tempo de execução
// da query isolada em milissegundos para medição pelo teste k6 PT-4.
//
// Rastreabilidade: T-81 · NFR-6 · DT-10
//
// AVISO: Este endpoint só deve estar disponível em ambiente de teste/desenvolvimento.
// Em produção, proteger via variável de ambiente NODE_ENV ou remover.

import { NextRequest, NextResponse } from "next/server";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Bloquear em produção
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const username = request.nextUrl.searchParams.get("username");

  if (!username || username.trim().length === 0) {
    return NextResponse.json(
      { error: "Query param 'username' é obrigatório" },
      { status: 400 },
    );
  }

  const repo = new DrizzleUserRepository();

  const startMs = performance.now();
  const user = await repo.findByUsername(username.trim());
  const durationMs = performance.now() - startMs;

  return NextResponse.json({
    found: user !== null,
    durationMs: parseFloat(durationMs.toFixed(3)),
  });
}

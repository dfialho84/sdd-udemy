// Teste de segurança ST-1 — Rate limiting como controle contra flood de cadastros
// Simula vetor de ataque: flood de POST /api/auth/register a partir de um único IP.
// Rastreabilidade: T-51 · ST-1 · NFR-4
//
// Pré-requisitos:
//   - banco MySQL de teste rodando com migration aplicada (kanban_mysql)
//   - Mailhog rodando via Docker Compose (kanban_mailhog)
//   - DATABASE_URL apontando para o banco de teste

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import { setDepsFactory, resetDepsFactory, buildUseCaseDeps } from "@/app/api/auth/register/deps";
import { registerRateLimiter } from "@/adapters/inbound/http/rate-limiter";
import { db } from "@/lib/db";
import { users, confirmationTokens } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";

// Helper para construir request POST com IP especifico via header x-forwarded-for
function makeRequest(
  body: unknown,
  ip: string,
): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

// Payload valido base para o teste de flood
function validPayload(emailSuffix: string) {
  return {
    name: "Atacante ST1",
    email: `st1-${emailSuffix}@example.com`,
    password: "Senha@1234",
    passwordConfirmation: "Senha@1234",
    birthDate: "1990-01-01",
  };
}

// Remove registros de teste desta suite (prefixo st1-)
async function cleanupST1(): Promise<void> {
  const st1Users = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, "st1-%@example.com"));

  for (const u of st1Users) {
    await db
      .delete(confirmationTokens)
      .where(eq(confirmationTokens.userId, u.id));
  }

  await db.delete(users).where(like(users.email, "st1-%@example.com"));
}

describe("ST-1: Rate limiting — controle de flood de registros por IP (segurança)", () => {
  const ATTACKER_IP = "10.0.0.99";
  const VICTIM_IP = "10.0.0.100";

  beforeAll(() => {
    setDepsFactory(buildUseCaseDeps);
  });

  beforeEach(async () => {
    await cleanupST1();
    // Reseta o contador do IP de ataque para garantir isolamento entre testes
    registerRateLimiter.reset(ATTACKER_IP);
    registerRateLimiter.reset(VICTIM_IP);
  });

  afterAll(async () => {
    await cleanupST1();
    resetDepsFactory();
    registerRateLimiter.reset(ATTACKER_IP);
    registerRateLimiter.reset(VICTIM_IP);
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  // -----------------------------------------------------------------------
  // ST-1a — Tres primeiras tentativas do mesmo IP sao processadas (nao 429)
  // -----------------------------------------------------------------------
  it("ST-1a: três primeiras tentativas do mesmo IP são processadas normalmente (não 429)", async () => {
    // 1ª tentativa
    const res1 = await POST(makeRequest(validPayload("flood1"), ATTACKER_IP));
    expect(res1.status).not.toBe(429);

    // 2ª tentativa — email diferente para nao conflitar com unicidade
    const res2 = await POST(makeRequest(validPayload("flood2"), ATTACKER_IP));
    expect(res2.status).not.toBe(429);

    // 3ª tentativa
    const res3 = await POST(makeRequest(validPayload("flood3"), ATTACKER_IP));
    expect(res3.status).not.toBe(429);
  });

  // -----------------------------------------------------------------------
  // ST-1b — Quarta tentativa do mesmo IP e bloqueada com HTTP 429 e estrutura padronizada
  // -----------------------------------------------------------------------
  it("ST-1b: quarta tentativa do mesmo IP retorna HTTP 429 com estrutura padronizada", async () => {
    // Esgotar o limite com 3 tentativas
    await POST(makeRequest(validPayload("block1"), ATTACKER_IP));
    await POST(makeRequest(validPayload("block2"), ATTACKER_IP));
    await POST(makeRequest(validPayload("block3"), ATTACKER_IP));

    // Quarta tentativa — deve ser bloqueada
    const response = await POST(makeRequest(validPayload("block4"), ATTACKER_IP));

    expect(response.status).toBe(429);

    const json = await response.json();

    // Verifica estrutura padronizada (constitution.md, regra 5)
    expect(json.codigo).toBe(429);
    expect(json.mensagem).toBeDefined();
    expect(typeof json.mensagem).toBe("string");
    expect(json.requestId).toBeDefined();
    expect(json.timestamp).toBeDefined();

    // Verifica que nenhum processamento adicional foi realizado
    // (usuario block4 nao deve existir no banco)
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(like(users.email, "st1-block4@example.com"));

    expect(rows).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // ST-1c — IP diferente nao e bloqueado mesmo quando atacante atingiu o limite
  // -----------------------------------------------------------------------
  it("ST-1c: tentativa de IP diferente não é bloqueada pelo limite do atacante", async () => {
    // Esgotar o limite do IP do atacante
    await POST(makeRequest(validPayload("iptest1"), ATTACKER_IP));
    await POST(makeRequest(validPayload("iptest2"), ATTACKER_IP));
    await POST(makeRequest(validPayload("iptest3"), ATTACKER_IP));

    // Confirma que o atacante esta bloqueado
    const blockedResponse = await POST(makeRequest(validPayload("iptestblocked"), ATTACKER_IP));
    expect(blockedResponse.status).toBe(429);

    // IP diferente (vitima) nao deve ser afetada
    const victimResponse = await POST(makeRequest(validPayload("victim"), VICTIM_IP));
    expect(victimResponse.status).not.toBe(429);
  });
});

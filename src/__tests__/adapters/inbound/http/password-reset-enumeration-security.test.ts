// Testes de seguranca ST-1 — Prevencao de enumeracao de contas
// via endpoint POST /api/auth/password-reset/request
// Rastreabilidade: NFR-3 · REQ-14 · T-39
//
// Verifica que o endpoint nao permite distinguir entre email cadastrado
// e email nao cadastrado — resposta (status, body) e tempo sao identicos.
//
// Casos cobertos:
//   (a) Email cadastrado: resposta 200 com mensagem generica
//   (b) Email nao cadastrado: resposta 200 com a mesma mensagem generica
//   (c) Respostas identicas entre os dois casos (status + body)
//   (d) Diferenca de p95 do tempo de resposta entre os dois casos < 50ms

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/password-reset/route";
import {
  setDepsFactory,
  resetDepsFactory,
  resetRateLimiter,
} from "@/app/api/auth/password-reset/deps";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { IEmailService } from "@/domain/ports/password-reset-email-service";
import type { AuditLogger } from "@/domain/ports/audit-logger";
import { User } from "@/domain/entities/user";
import type { UserProps } from "@/domain/entities/user";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const GENERIC_MESSAGE =
  "Se existe conta com esse email, voce recebera um link de recuperacao";

const ACTIVE_USER_PROPS: UserProps = {
  id: "user-uuid-st1",
  name: "ST1 User",
  username: "st1user",
  email: "cadastrado@example.com",
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
  birthDate: new Date("1990-01-01"),
  avatarKey: null,
  status: "active",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const ACTIVE_USER = new User(ACTIVE_USER_PROPS);

// ─── Mocks globais (resetados via clearMocks no beforeEach) ────────────────

const mockFindByEmail = jest.fn<Promise<User | null>, [string]>();

const mockUserRepository: UserRepository = {
  findByEmail: mockFindByEmail,
  findByUsername: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  activate: jest.fn(),
  updatePassword: jest.fn(),
  invalidateAllSessions: jest.fn(),
};

const mockTokenRepository: IPasswordResetTokenRepository = {
  create: jest.fn(),
  findByHash: jest.fn(),
  markAsUsed: jest.fn(),
};

const mockEmailService: IEmailService = {
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
};

const mockAuditLogger: AuditLogger = {
  log: jest.fn(),
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeRequest(
  email: string,
  ip: string = "127.0.0.1",
): NextRequest {
  return new NextRequest("http://localhost/api/auth/password-reset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email }),
  });
}

/**
 * Mede o tempo de uma chamada ao endpoint em milissegundos.
 * Retorna { status, json, durationMs }.
 */
async function timedPost(
  request: NextRequest,
): Promise<{ status: number; json: unknown; durationMs: number }> {
  const start = performance.now();
  const response = await POST(request);
  const durationMs = performance.now() - start;
  const json = await response.json();
  return { status: response.status, json, durationMs };
}

/** Calcula o percentil p de um array de valores numericos. */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index]!;
}

// ─── Suite de testes ───────────────────────────────────────────────────────

describe("ST-1: Prevencao de enumeracao de contas via endpoint de solicitacao (seguranca)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimiter();

    // Configuracao padrao dos mocks:
    // - "cadastrado@example.com" retorna usuario ativo
    // - qualquer outro email retorna null (nao cadastrado)
    mockFindByEmail.mockImplementation(async (email: string) => {
      if (email === "cadastrado@example.com") return ACTIVE_USER;
      return null;
    });

    setDepsFactory(() => ({
      userRepository: mockUserRepository,
      passwordResetTokenRepository: mockTokenRepository,
      emailService: mockEmailService,
      auditLogger: mockAuditLogger,
    }));
  });

  afterEach(() => {
    resetDepsFactory();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // (a) Email cadastrado — resposta 200 com mensagem generica
  // ──────────────────────────────────────────────────────────────────────────
  it("(a) email cadastrado retorna 200 com mensagem generica (REQ-2)", async () => {
    const response = await POST(makeRequest("cadastrado@example.com"));

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.message).toBe(GENERIC_MESSAGE);
    expect(body.linkCadastro).toBe("/register");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // (b) Email nao cadastrado — resposta 200 com a mesma mensagem generica
  // ──────────────────────────────────────────────────────────────────────────
  it("(b) email nao cadastrado retorna 200 com mensagem generica (REQ-14)", async () => {
    const response = await POST(
      makeRequest("nao-cadastrado@example.com"),
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.message).toBe(GENERIC_MESSAGE);
    expect(body.linkCadastro).toBe("/register");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // (c) Respostas identicas entre os dois casos
  // ──────────────────────────────────────────────────────────────────────────
  it("(c) resposta para email cadastrado e nao cadastrado sao identicas (status + body)", async () => {
    const [resCadastrado, resNaoCadastrado] = await Promise.all([
      POST(makeRequest("cadastrado@example.com", "192.168.1.10")),
      POST(makeRequest("nao-cadastrado@example.com", "192.168.1.11")),
    ]);

    // Status identico
    expect(resCadastrado.status).toBe(200);
    expect(resNaoCadastrado.status).toBe(200);

    const bodyCadastrado = (await resCadastrado.json()) as Record<
      string,
      unknown
    >;
    const bodyNaoCadastrado = (await resNaoCadastrado.json()) as Record<
      string,
      unknown
    >;

    // Campos presentes e identicos
    expect(bodyCadastrado).toEqual(bodyNaoCadastrado);
    expect(bodyCadastrado.message).toBe(GENERIC_MESSAGE);
    expect(bodyNaoCadastrado.message).toBe(GENERIC_MESSAGE);
    expect(bodyCadastrado.linkCadastro).toBe("/register");
    expect(bodyNaoCadastrado.linkCadastro).toBe("/register");

    // Garante que nenhum dado do usuario vazou na resposta
    const strResposta = JSON.stringify(bodyCadastrado);
    expect(strResposta).not.toContain(ACTIVE_USER_PROPS.id);
    expect(strResposta).not.toContain(ACTIVE_USER_PROPS.name);
    expect(strResposta).not.toContain(ACTIVE_USER_PROPS.email);
    expect(strResposta).not.toContain(ACTIVE_USER_PROPS.username);
    expect(strResposta).not.toContain(ACTIVE_USER_PROPS.passwordHash);
    expect(strResposta).not.toContain(ACTIVE_USER_PROPS.status);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // (d) Anti-enumeracao temporal — p95 timing difference < 50ms
  // ──────────────────────────────────────────────────────────────────────────
  it("(d) diferenca de p95 do tempo de resposta entre email cadastrado e nao cadastrado < 50ms (NFR-3)", async () => {
    const AMOSTRAS = 50;

    // Aquecimento — descartado da medicao (estabiliza JIT)
    await POST(makeRequest("warmup1@example.com", "warmup-ip-1"));
    await POST(makeRequest("warmup2@example.com", "warmup-ip-2"));

    const temposCadastrado: number[] = [];
    const temposNaoCadastrado: number[] = [];

    for (let i = 0; i < AMOSTRAS; i++) {
      const reqCadastrado = makeRequest(
        "cadastrado@example.com",
        `st1-cad-${i}`,
      );
      const { durationMs: dCad } = await timedPost(reqCadastrado);
      temposCadastrado.push(dCad);

      const reqNaoCadastrado = makeRequest(
        `nao-cadastrado-${i}@example.com`,
        `st1-nao-${i}`,
      );
      const { durationMs: dNao } = await timedPost(reqNaoCadastrado);
      temposNaoCadastrado.push(dNao);
    }

    const p95Cadastrado = percentile(temposCadastrado, 95);
    const p95NaoCadastrado = percentile(temposNaoCadastrado, 95);

    const diferencaMs = Math.abs(p95Cadastrado - p95NaoCadastrado);

    // Tolerancia: 50ms conforme test-strategy.md ST-1
    // Com mocks síncronos de repositorio e servico de email, ambos os
    // casos sao igualmente rapidos. O threshold garante que mesmo com
    // variacao de ambiente nao haja discrepancia que permita inferencia
    // por timing attack.
    expect(diferencaMs).toBeLessThanOrEqual(50);
  });
});

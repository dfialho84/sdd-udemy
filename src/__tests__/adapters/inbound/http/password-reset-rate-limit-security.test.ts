// Teste de seguranca ST-3 — Rate limiting por IP no endpoint de solicitacao de recuperacao de senha
// Verifica que apos 5 tentativas do mesmo IP, o endpoint bloqueia requisicoes subsequentes
// e registra em log de auditoria. Bloqueio e por IP, nao global (isolamento entre IPs).
// Rastreabilidade: T-41 · ST-3 · NFR-5 · REQ-16

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/password-reset/route";
import {
  setDepsFactory,
  resetDepsFactory,
  resetRateLimiter,
} from "@/app/api/auth/password-reset/deps";
import { AuditLogger } from "@/lib/observability/audit-logger";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { IEmailService } from "@/domain/ports/password-reset-email-service";
import type { AuditLogger as IAuditLogger } from "@/domain/ports/audit-logger";

// ─── Constantes ────────────────────────────────────────────────────────

const ATTACKER_IP = "10.0.0.99";
const VICTIM_IP = "10.0.0.100";

// ─── Helpers ───────────────────────────────────────────────────────────

function makeRequest(email: string, ip: string): NextRequest {
  return new NextRequest("http://localhost/api/auth/password-reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email }),
  });
}

// ─── Suite de testes ───────────────────────────────────────────────────

describe("ST-3: Rate limiting por IP no formulario de email (seguranca)", () => {
  let auditLogSpy: jest.SpyInstance;

  beforeAll(() => {
    // Mocks das dependencias do caso de uso para rodar sem banco real
    setDepsFactory(() => ({
      userRepository: {
        findByEmail: jest.fn().mockResolvedValue(null),
        findByUsername: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue(undefined),
        activate: jest.fn().mockResolvedValue(undefined),
        updatePassword: jest.fn().mockResolvedValue(undefined),
        invalidateAllSessions: jest.fn().mockResolvedValue(undefined),
      } as unknown as UserRepository,
      passwordResetTokenRepository: {
        create: jest.fn().mockResolvedValue(undefined),
        findByHash: jest.fn().mockResolvedValue(null),
        markAsUsed: jest.fn().mockResolvedValue(undefined),
      } as unknown as IPasswordResetTokenRepository,
      emailService: {
        sendPasswordReset: jest.fn().mockResolvedValue(undefined),
      } as unknown as IEmailService,
      auditLogger: {
        log: jest.fn().mockResolvedValue(undefined),
      } as IAuditLogger,
    }));

    // Espia chamadas ao AuditLogger concreto (usado no bloqueio por rate limit)
    auditLogSpy = jest.spyOn(AuditLogger.prototype, "log");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetRateLimiter(); // Limpa contadores entre testes (isolamento)
  });

  afterAll(() => {
    auditLogSpy.mockRestore();
    resetDepsFactory();
    resetRateLimiter();
  });

  // -----------------------------------------------------------------------
  // (a) 5 tentativas do mesmo IP retornam 200
  // -----------------------------------------------------------------------
  it("(a) 5 tentativas do mesmo IP retornam 200 (REQ-16)", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await POST(makeRequest(`st3a-test${i}@example.com`, ATTACKER_IP));
      expect(res.status).toBe(200);
    }
  });

  // -----------------------------------------------------------------------
  // (b) 6a tentativa do mesmo IP retorna 429 com code RATE_LIMIT_EXCEEDED
  // -----------------------------------------------------------------------
  it("(b) 6a tentativa do mesmo IP retorna 429 com RATE_LIMIT_EXCEEDED (NFR-5)", async () => {
    // Esgotar o limite com 5 tentativas
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(`st3b-block${i}@example.com`, ATTACKER_IP));
    }

    // 6a tentativa — bloqueada
    const res = await POST(makeRequest("st3b-over@example.com", ATTACKER_IP));
    expect(res.status).toBe(429);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(body.message).toBe("Muitas tentativas de recuperacao. Tente novamente em 1 hora");
    expect(body.requestId).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // (c) Log de auditoria registrado com IP e timestamp
  // -----------------------------------------------------------------------
  it("(c) log de auditoria registra bloqueio com IP e timestamp (NFR-6)", async () => {
    // Esgotar o limite
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(`st3c-log${i}@example.com`, ATTACKER_IP));
    }

    // 6a tentativa — gera log de auditoria
    await POST(makeRequest("st3c-blocked@example.com", ATTACKER_IP));

    expect(auditLogSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PASSWORD_RESET_RATE_LIMIT_BLOCKED",
        ip: ATTACKER_IP,
        timestamp: expect.any(Date),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // (d) IP diferente nao e bloqueado (isolamento por IP, nao global)
  // -----------------------------------------------------------------------
  it("(d) IP diferente nao e bloqueado pelo limite do primeiro IP (isolamento por IP)", async () => {
    // Esgotar o limite do atacante
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(`st3d-ip${i}@example.com`, ATTACKER_IP));
    }

    // Confirmar atacante bloqueado
    const blockedRes = await POST(makeRequest("st3d-blocked@example.com", ATTACKER_IP));
    expect(blockedRes.status).toBe(429);

    // IP diferente (vitima) nao e bloqueado
    const victimRes = await POST(makeRequest("st3d-victim@example.com", VICTIM_IP));
    expect(victimRes.status).toBe(200);
  });
});

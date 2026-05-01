// Teste de performance PT-1 — Latenciado endpoint POST /api/auth/password-reset/confirm (p95)
// Mede o tempo de resposta do endpoint de redefinicao de senha: validacao de token,
// atualizacao de senha e invalidacao de sessoes.
// Threshold: p95 <= 500ms (NFR-2)
// Execucoes: 100 requisicoes sequenciais com tokens unicos pre-criados e mocks.
// Rastreabilidade: T-44 · PT-1 · NFR-2

import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { POST } from "@/app/api/auth/password-reset/confirm/route";
import {
  setDepsFactory,
  resetDepsFactory,
} from "@/app/api/auth/password-reset/confirm/deps";
import { PasswordResetToken } from "@/domain/entities/password-reset-token";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { AuditLogger } from "@/domain/ports/audit-logger";

// ─── Config ────────────────────────────────────────────────────────────

const REQUESTS = 100;
const THRESHOLD_P95_MS = 500;
const BENCHMARK_USER_ID = "pt1-benchmark-user";

// ─── Calcula percentil ─────────────────────────────────────────────────

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index]!;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function makeRequest(
  token: string,
  password: string = "Str0ng!Pass",
  passwordConfirm: string = "Str0ng!Pass",
): NextRequest {
  return new NextRequest("http://localhost/api/auth/password-reset/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password, passwordConfirm }),
  });
}

// ─── Suite de benchmark ────────────────────────────────────────────────

describe("PT-1: Latenciado endpoint POST /api/auth/password-reset/confirm (p95)", () => {
  // Mocks — compartilhados entre todas as iteracoes
  const mockFindByHash = jest.fn<Promise<PasswordResetToken | null>, [string]>();
  const mockMarkAsUsed = jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
  const mockUpdatePassword = jest.fn<Promise<void>, [string, string]>();
  const mockInvalidateAllSessions = jest.fn<Promise<void>, [string]>();
  const mockHash = jest.fn<Promise<string>, [string]>().mockResolvedValue(
    "$argon2id$v=19$m=65536,t=3,p=2$pt1-hash",
  );
  const mockLog = jest.fn<Promise<void>, Parameters<AuditLogger["log"]>>();

  const mockTokenRepository: IPasswordResetTokenRepository = {
    create: jest.fn(),
    findByHash: mockFindByHash,
    markAsUsed: mockMarkAsUsed,
  };

  const mockUserRepository: UserRepository = {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    activate: jest.fn(),
    updatePassword: mockUpdatePassword,
    invalidateAllSessions: mockInvalidateAllSessions,
  };

  const mockPasswordHasher: PasswordHasher = {
    hash: mockHash,
  };

  const mockAuditLogger: AuditLogger = {
    log: mockLog,
  };

  beforeAll(() => {
    // Mock findByHash: aceita qualquer hash e retorna token valido
    mockFindByHash.mockImplementation(async (_hash: string) => {
      return new PasswordResetToken({
        tokenHash: _hash,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // +12h
        usedAt: null,
        userId: BENCHMARK_USER_ID,
      });
    });

    setDepsFactory(() => ({
      passwordResetTokenRepository: mockTokenRepository,
      userRepository: mockUserRepository,
      passwordHasher: mockPasswordHasher,
      auditLogger: mockAuditLogger,
    }));
  });

  afterAll(() => {
    resetDepsFactory();
  });

  it(
    `p95 de ${REQUESTS} requisicoes <= ${THRESHOLD_P95_MS}ms (NFR-2)`,
    async () => {
      const times: number[] = [];

      // Aquecimento — estabiliza JIT
      const warmupToken = "pt1-warmup-" + "a".repeat(40);
      await POST(makeRequest(warmupToken));

      for (let i = 0; i < REQUESTS; i++) {
        // Token unico por requisicao (hash sera calculado pelo route handler)
        const token = `pt1-bench-${String(i).padStart(3, "0")}-${"x".repeat(35)}`;

        const start = performance.now();
        const res = await POST(makeRequest(token));
        const elapsed = performance.now() - start;

        expect(res.status).toBe(200);
        times.push(elapsed);
      }

      const p95 = percentile(times, 95);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      console.log(`[PT-1] Confirm endpoint — ${REQUESTS} requisicoes:`);
      console.log(`  Media: ${avg.toFixed(2)}ms`);
      console.log(`  Min:   ${min.toFixed(2)}ms`);
      console.log(`  Max:   ${max.toFixed(2)}ms`);
      console.log(`  p95:   ${p95.toFixed(2)}ms`);
      console.log(`  Threshold: p95 <= ${THRESHOLD_P95_MS}ms`);

      expect(p95).toBeLessThanOrEqual(THRESHOLD_P95_MS);

      // Verificar que todas as interacoes esperadas ocorreram
      expect(mockFindByHash).toHaveBeenCalledTimes(REQUESTS + 1); // +1 warmup
      expect(mockMarkAsUsed).toHaveBeenCalledTimes(REQUESTS + 1);
      expect(mockUpdatePassword).toHaveBeenCalledTimes(REQUESTS + 1);
      expect(mockInvalidateAllSessions).toHaveBeenCalledTimes(REQUESTS + 1);
      expect(mockHash).toHaveBeenCalledTimes(REQUESTS + 1);
      expect(mockLog).toHaveBeenCalledTimes(REQUESTS + 1);
    },
    120000, // timeout de 2min para 100 requisicoes
  );
});

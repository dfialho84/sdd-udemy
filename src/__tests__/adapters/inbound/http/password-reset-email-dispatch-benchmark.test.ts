// Teste de performance PT-2 — Tempo de disparo do envio de email apos solicitacao de recuperacao (p95)
// Mede o intervalo entre a resposta HTTP do endpoint request e a chamada ao
// EmailServiceAdapter disparando o envio.
// Threshold: disparo em <= 5s para 95% dos casos (NFR-1).
// NFR-1 diz que entrega final pode levar ate 1 min, mas o disparo do adapter
// deve ser imediato (fire-and-forget).
// Execucoes: 50 execucoes com emails distintos.
// Rastreabilidade: T-45 · PT-2 · NFR-1

import { NextRequest } from "next/server";
import {
  POST,
} from "@/app/api/auth/password-reset/route";
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

// ─── Config ────────────────────────────────────────────────────────────

const REQUESTS = 50;
const THRESHOLD_P95_MS = 5000; // 5s conforme NFR-1

// ─── Fixtures ──────────────────────────────────────────────────────────

const ACTIVE_USER_PROPS: UserProps = {
  id: "pt2-user-id",
  name: "PT2 User",
  username: "pt2user",
  email: "pt2-active@example.com",
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
  birthDate: new Date("1990-01-01"),
  avatarKey: null,
  status: "active",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const ACTIVE_USER = new User(ACTIVE_USER_PROPS);

// ─── Calcula percentil ─────────────────────────────────────────────────

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index]!;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function makeRequest(email: string, ip: string = "127.0.0.1"): NextRequest {
  return new NextRequest("http://localhost/api/auth/password-reset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email }),
  });
}

// ─── Suite de benchmark ────────────────────────────────────────────────

describe("PT-2: Tempo de disparo do envio de email apos solicitacao de recuperacao (p95)", () => {
  // State
  let emailDispatchTimestamps: number[] = [];

  // Mocks
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
    create: jest.fn().mockResolvedValue(undefined),
    findByHash: jest.fn().mockResolvedValue(null),
    markAsUsed: jest.fn().mockResolvedValue(undefined),
  };

  // Email service instrumentado com timestamp de chamada
  const mockEmailService: IEmailService = {
    sendPasswordReset: jest.fn().mockImplementation(async (_email: string, _token: string) => {
      emailDispatchTimestamps.push(performance.now());
    }),
  };

  const mockAuditLogger: AuditLogger = {
    log: jest.fn(),
  };

  beforeAll(() => {
    // Mock: qualquer email retorna usuario ativo
    mockFindByEmail.mockResolvedValue(ACTIVE_USER);

    setDepsFactory(() => ({
      userRepository: mockUserRepository,
      passwordResetTokenRepository: mockTokenRepository,
      emailService: mockEmailService,
      auditLogger: mockAuditLogger,
    }));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    emailDispatchTimestamps = [];
    resetRateLimiter();
  });

  afterAll(() => {
    resetDepsFactory();
  });

  it(
    `p95 de ${REQUESTS} execucoes <= ${THRESHOLD_P95_MS}ms (NFR-1)`,
    async () => {
      const intervals: number[] = [];

      // Aquecimento — descartado da metrica
      await POST(makeRequest("pt2-warmup@example.com", "warmup-ip"));

      // Reset apos warmup: limpa contagem de chamadas e timestamps
      jest.clearAllMocks();
      mockFindByEmail.mockResolvedValue(ACTIVE_USER);
      emailDispatchTimestamps = [];

      for (let i = 0; i < REQUESTS; i++) {
        const email = `pt2-user-${String(i).padStart(3, "0")}@example.com`;
        const ip = `10.0.0.${i}`;

        // Registra timestamp antes da chamada
        const requestStart = performance.now();
        const res = await POST(makeRequest(email, ip));

        expect(res.status).toBe(200);

        // Coleta o timestamp de dispatch registrado pelo mock
        const dispatchTime = emailDispatchTimestamps[i]!;

        // Intervalo: do inicio da requisicao ate o dispatch do email
        const interval = dispatchTime - requestStart;
        intervals.push(interval);
      }

      const p95 = percentile(intervals, 95);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const max = Math.max(...intervals);
      const min = Math.min(...intervals);

      console.log(`[PT-2] Email dispatch apos request — ${REQUESTS} execucoes:`);
      console.log(`  Media: ${avg.toFixed(2)}ms`);
      console.log(`  Min:   ${min.toFixed(2)}ms`);
      console.log(`  Max:   ${max.toFixed(2)}ms`);
      console.log(`  p95:   ${p95.toFixed(2)}ms`);
      console.log(`  Threshold: p95 <= ${THRESHOLD_P95_MS}ms`);

      expect(p95).toBeLessThanOrEqual(THRESHOLD_P95_MS);

      // Verificar metricas de auditoria e persistencia (apos warmup reset)
      expect(mockEmailService.sendPasswordReset).toHaveBeenCalledTimes(REQUESTS);
      expect(mockTokenRepository.create).toHaveBeenCalledTimes(REQUESTS);
      expect(mockAuditLogger.log).toHaveBeenCalled();
    },
    60000, // timeout de 60s
  );
});

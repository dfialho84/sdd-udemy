// Teste de seguranca ST-4 — Token nao exposto em logs, respostas HTTP ou mensagens de erro
// Verifica que o token em texto plano nunca aparece em logs estruturados, em respostas
// de erro ou em qualquer output observavel do lado do servidor.
// Rastreabilidade: T-42 · ST-4 · NFR-3 · Risco PRD "Token armazenado de forma insegura"
//
// Casos cobertos:
//   (a) Solicitacao com email valido: logs de auditoria nao contem token em texto plano
//   (b) Tentativa com token invalido: mensagem de erro nao ecoa o token recebido
//   (c) Resposta de todos os endpoints: nenhum campo contem o token completo

import { NextRequest } from "next/server";
import { POST as requestPOST } from "@/app/api/auth/password-reset/route";
import { POST as confirmPOST } from "@/app/api/auth/password-reset/confirm/route";
import { GET as validateGET } from "@/app/api/auth/password-reset/validate/route";
import {
  setDepsFactory as setRequestDepsFactory,
  resetDepsFactory as resetRequestDepsFactory,
  resetRateLimiter,
} from "@/app/api/auth/password-reset/deps";
import {
  setDepsFactory as setConfirmDepsFactory,
  resetDepsFactory as resetConfirmDepsFactory,
} from "@/app/api/auth/password-reset/confirm/deps";
import {
  setDepsFactory as setValidateDepsFactory,
  resetDepsFactory as resetValidateDepsFactory,
} from "@/app/api/auth/password-reset/validate/deps";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { IEmailService } from "@/domain/ports/password-reset-email-service";
import type { AuditLogger } from "@/domain/ports/audit-logger";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import { User } from "@/domain/entities/user";
import type { UserProps } from "@/domain/entities/user";
import { PasswordResetToken } from "@/domain/entities/password-reset-token";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const ACTIVE_USER_PROPS: UserProps = {
  id: "user-uuid-st4",
  name: "ST4 User",
  username: "st4user",
  email: "st4-cadastrado@example.com",
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
  birthDate: new Date("1990-01-01"),
  avatarKey: null,
  status: "active",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const ACTIVE_USER = new User(ACTIVE_USER_PROPS);

// ─── State tracking ─────────────────────────────────────────────────────────

let capturedToken: string | null = null;
let auditLogEntries: Record<string, unknown>[] = [];

// ─── Mocks ──────────────────────────────────────────────────────────────────

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

const mockRequestTokenRepository: IPasswordResetTokenRepository = {
  create: jest.fn().mockResolvedValue(undefined),
  findByHash: jest.fn().mockResolvedValue(null),
  markAsUsed: jest.fn().mockResolvedValue(undefined),
};

const mockEmailService: IEmailService = {
  sendPasswordReset: jest.fn().mockImplementation(async (_email: string, token: string) => {
    capturedToken = token;
  }),
};

const mockAuditLogger: AuditLogger = {
  log: jest.fn().mockImplementation(async (event) => {
    auditLogEntries.push(event as unknown as Record<string, unknown>);
  }),
};

const mockConfirmTokenRepository: IPasswordResetTokenRepository = {
  create: jest.fn().mockResolvedValue(undefined),
  findByHash: jest.fn().mockResolvedValue(null),
  markAsUsed: jest.fn().mockResolvedValue(undefined),
};

const mockConfirmPasswordHasher: PasswordHasher = {
  hash: jest.fn().mockResolvedValue("$argon2id$v=19$m=65536,t=3,p=2$hash-st4"),
};

const mockConfirmAuditLogger: AuditLogger = {
  log: jest.fn(),
};

const mockConfirmUserRepository: UserRepository = {
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  activate: jest.fn(),
  updatePassword: jest.fn().mockResolvedValue(undefined),
  invalidateAllSessions: jest.fn().mockResolvedValue(undefined),
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function makeConfirmRequest(
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

// ─── Suite de testes ───────────────────────────────────────────────────────

describe("ST-4: Token nao exposto em logs, respostas HTTP ou mensagens de erro (seguranca)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedToken = null;
    auditLogEntries = [];
    resetRateLimiter();
  });

  afterEach(() => {
    resetRequestDepsFactory();
    resetConfirmDepsFactory();
    resetValidateDepsFactory();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // (a) Logs de auditoria nao contem token apos solicitacao com email valido
  // ──────────────────────────────────────────────────────────────────────────
  it("(a) logs de auditoria nao contem token em texto plano apos solicitacao com email valido (NFR-3)", async () => {
    mockFindByEmail.mockResolvedValue(ACTIVE_USER);

    setRequestDepsFactory(() => ({
      userRepository: mockUserRepository,
      passwordResetTokenRepository: mockRequestTokenRepository,
      emailService: mockEmailService,
      auditLogger: mockAuditLogger,
    }));

    const res = await requestPOST(makeRequest("st4-cadastrado@example.com"));
    expect(res.status).toBe(200);

    // Token deve ter sido capturado pelo spy no emailService
    expect(capturedToken).not.toBeNull();
    expect(typeof capturedToken).toBe("string");

    // Verificar que nenhum log de auditoria contem o token em texto plano
    expect(auditLogEntries.length).toBeGreaterThan(0);
    for (const entry of auditLogEntries) {
      const strEntry = JSON.stringify(entry);
      expect(strEntry).not.toContain(capturedToken);
    }

    // Verificar que o token nao aparece na resposta HTTP
    const resBody = (await res.json()) as Record<string, unknown>;
    const strResponse = JSON.stringify(resBody);
    expect(strResponse).not.toContain(capturedToken);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // (b) Mensagem de erro nao ecoa o token recebido
  // ──────────────────────────────────────────────────────────────────────────
  it("(b) mensagem de erro nao ecoa o token recebido em tentativa com token invalido", async () => {
    mockConfirmTokenRepository.findByHash = jest.fn().mockResolvedValue(null);

    setConfirmDepsFactory(() => ({
      passwordResetTokenRepository: mockConfirmTokenRepository,
      userRepository: mockConfirmUserRepository,
      passwordHasher: mockConfirmPasswordHasher,
      auditLogger: mockConfirmAuditLogger,
    }));

    const invalidToken = "st4-invalid-token-123456789012345678901234567890";
    const res = await confirmPOST(makeConfirmRequest(invalidToken));

    expect(res.status).toBe(404);

    const body = (await res.json()) as Record<string, unknown>;
    const strBody = JSON.stringify(body);

    // O token nao deve aparecer em nenhum campo da resposta de erro
    expect(strBody).not.toContain(invalidToken);
    expect(strBody).not.toContain(invalidToken.substring(0, 20));

    // A mensagem de erro nao deve conter fragmentos do token
    if (body.message && typeof body.message === "string") {
      expect(body.message).not.toContain(invalidToken);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // (c) Nenhum endpoint expoe o token completo na resposta
  // ──────────────────────────────────────────────────────────────────────────
  it("(c) nenhum campo de resposta de nenhum endpoint contem o token completo", async () => {
    // (c1) Validate endpoint: token malformado
    const invalidTokenValidate = "st4-malformed-token-abc123def456ghi789";
    const validateReq = new NextRequest(
      `http://localhost/api/auth/password-reset/validate?token=${invalidTokenValidate}`,
    );

    setValidateDepsFactory(() => ({
      passwordResetTokenRepository: {
        create: jest.fn(),
        findByHash: jest.fn().mockResolvedValue(null),
        markAsUsed: jest.fn(),
      },
    }));

    const validateRes = await validateGET(validateReq);
    const validateBody = (await validateRes.json()) as Record<string, unknown>;
    const strValidate = JSON.stringify(validateBody);
    expect(strValidate).not.toContain(invalidTokenValidate);

    resetValidateDepsFactory();

    // (c2) Confirm endpoint: token invalido (ja coberto em (b), mas repetimos
    //      explicitamente como parte da verificacao de todos os endpoints)
    const invalidTokenConfirm = "st4-confirm-invalid-token-xxxxxxxxxxxxxxxxxxxx";
    mockConfirmTokenRepository.findByHash = jest.fn().mockResolvedValue(null);

    setConfirmDepsFactory(() => ({
      passwordResetTokenRepository: mockConfirmTokenRepository,
      userRepository: mockConfirmUserRepository,
      passwordHasher: mockConfirmPasswordHasher,
      auditLogger: mockConfirmAuditLogger,
    }));

    const confirmRes = await confirmPOST(makeConfirmRequest(invalidTokenConfirm));
    const confirmBody = (await confirmRes.json()) as Record<string, unknown>;
    const strConfirm = JSON.stringify(confirmBody);
    expect(strConfirm).not.toContain(invalidTokenConfirm);

    resetConfirmDepsFactory();

    // (c3) Request endpoint: qualquer resposta de erro nao contem token
    mockFindByEmail.mockResolvedValue(ACTIVE_USER);

    setRequestDepsFactory(() => ({
      userRepository: mockUserRepository,
      passwordResetTokenRepository: mockRequestTokenRepository,
      emailService: mockEmailService,
      auditLogger: mockAuditLogger,
    }));

    const requestRes = await requestPOST(makeRequest("st4-request-test@example.com"));
    expect(requestRes.status).toBe(200);
    const requestBody = (await requestRes.json()) as Record<string, unknown>;
    const strRequest = JSON.stringify(requestBody);
    expect(strRequest).not.toContain(capturedToken);

    resetRequestDepsFactory();
  });
});

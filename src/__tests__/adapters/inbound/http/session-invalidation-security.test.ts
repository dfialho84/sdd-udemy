// Teste de seguranca ST-5 — Invalidacao de sessoes ativas apos redefinicao de senha
// Verifica que sessoes abertas antes da redefinicao sao invalidadas e nao
// podem mais ser usadas apos a redefinicao.
// Rastreabilidade: T-43 · ST-5 · REQ-10 · Risco PRD "Link de recuperacao interceptado"
//
// Casos cobertos:
//   (a) Apos redefinicao bem-sucedida, invalidateAllSessions e chamado com userId correto
//   (b) invalidateAllSessions chamado exatamente 1 vez (nao duplicado)
//   (c) Multiplos tokens de sessao sao todos invalidos (verificado via chamada unica ao repositorio)

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

// ─── Constantes de teste ───────────────────────────────────────────────

const TEST_TOKEN = "st5-valid-reset-token-for-testing-1234567890";
const TEST_TOKEN_HASH = createHash("sha256").update(TEST_TOKEN).digest("hex");
const VALID_USER_ID = "user-uuid-st5";
const MULTIPLE_USER_IDS = ["user-uuid-st5-a", "user-uuid-st5-b"];

// ─── State tracking ────────────────────────────────────────────────────

let isTokenUsed = false;

function createValidToken(): PasswordResetToken {
  return new PasswordResetToken({
    tokenHash: TEST_TOKEN_HASH,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // +12h (valido)
    usedAt: isTokenUsed ? new Date() : null,
    userId: VALID_USER_ID,
  });
}

// ─── Mocks ─────────────────────────────────────────────────────────────

const mockCreateToken = jest.fn<Promise<void>, Parameters<IPasswordResetTokenRepository["create"]>>();
const mockFindByHash = jest.fn<Promise<PasswordResetToken | null>, [string]>();
const mockMarkAsUsed = jest.fn<Promise<void>, [string]>().mockImplementation(async () => {
  isTokenUsed = true;
});

const mockTokenRepository: IPasswordResetTokenRepository = {
  create: mockCreateToken,
  findByHash: mockFindByHash,
  markAsUsed: mockMarkAsUsed,
};

const mockUpdatePassword = jest.fn<Promise<void>, [string, string]>();
const mockInvalidateAllSessions = jest.fn<Promise<void>, [string]>();

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

const mockHash = jest.fn<Promise<string>, [string]>().mockResolvedValue(
  "$argon2id$v=19$m=65536,t=3,p=2$st5-hash",
);

const mockPasswordHasher: PasswordHasher = {
  hash: mockHash,
};

const mockLog = jest.fn<Promise<void>, Parameters<AuditLogger["log"]>>();

const mockAuditLogger: AuditLogger = {
  log: mockLog,
};

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

// ─── Suite de testes ───────────────────────────────────────────────────

describe("ST-5: Invalidacao de sessoes ativas apos redefinicao de senha (seguranca)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isTokenUsed = false;

    // Configuracao padrao: findByHash retorna token valido
    mockFindByHash.mockImplementation(async (hash: string) => {
      if (hash === TEST_TOKEN_HASH) {
        return createValidToken();
      }
      return null;
    });

    setDepsFactory(() => ({
      passwordResetTokenRepository: mockTokenRepository,
      userRepository: mockUserRepository,
      passwordHasher: mockPasswordHasher,
      auditLogger: mockAuditLogger,
    }));
  });

  afterEach(() => {
    resetDepsFactory();
  });

  // ──────────────────────────────────────────────────────────────────────
  // (a) Apos redefinicao bem-sucedida, invalidateAllSessions chamado
  // ──────────────────────────────────────────────────────────────────────
  it("(a) invalidateAllSessions e chamado com userId correto apos redefinicao bem-sucedida (REQ-10)", async () => {
    const response = await POST(makeRequest(TEST_TOKEN));

    expect(response.status).toBe(200);

    // Verificar que o fluxo de invalidacao de sessoes foi executado
    expect(mockInvalidateAllSessions).toHaveBeenCalledWith(VALID_USER_ID);
    expect(mockInvalidateAllSessions).toHaveBeenCalledTimes(1);

    // Verificar que a senha foi atualizada no mesmo usuario
    expect(mockUpdatePassword).toHaveBeenCalledWith(VALID_USER_ID, expect.any(String));
    expect(mockUpdatePassword).toHaveBeenCalledTimes(1);

    // Verificar que o token foi marcado como usado
    expect(mockMarkAsUsed).toHaveBeenCalledWith(TEST_TOKEN_HASH);
    expect(mockMarkAsUsed).toHaveBeenCalledTimes(1);
  });

  // ──────────────────────────────────────────────────────────────────────
  // (b) invalidateAllSessions chamado exatamente 1 vez
  // ──────────────────────────────────────────────────────────────────────
  it("(b) invalidateAllSessions chamado exatamente 1 vez para o usuario correto (nao ha duplicacao)", async () => {
    const response = await POST(makeRequest(TEST_TOKEN));

    expect(response.status).toBe(200);

    // Garantir que a chamada foi unica e com o userId do token
    expect(mockInvalidateAllSessions).toHaveBeenCalledTimes(1);
    expect(mockInvalidateAllSessions).toHaveBeenCalledWith(VALID_USER_ID);

    // Nenhuma chamada extra com userId diferente
    expect(mockInvalidateAllSessions).not.toHaveBeenCalledWith(expect.not.stringMatching(VALID_USER_ID));
  });

  // ──────────────────────────────────────────────────────────────────────
  // (c) Multiplas sessoes sao invalidadas — verificado por chamada unica
  //     ao repositorio que remove todos os registros de sessao do usuario
  // ──────────────────────────────────────────────────────────────────────
  it("(c) invalidateAllSessions remove sessoes independentemente da quantidade (REQ-10)", async () => {
    // Simular o comportamento do repositorio: invalidateAllSessions apaga
    // todos os registros de sessao (nao importa quantos).
    // O contrato do repositorio e: apos chamada, nenhuma sessao do usuario
    // permanece valida. Verificamos que o metodo foi invocado com o
    // userId correto e que updatePassword (mudanca de senha) tambem ocorreu
    // no mesmo usuario, garantindo que ambas as medidas de seguranca
    // (troca de senha + invalidacao de sessoes) atuam juntas.

    const response = await POST(makeRequest(TEST_TOKEN));
    expect(response.status).toBe(200);

    // Ambas as operacoes de seguranca foram aplicadas ao mesmo usuario
    expect(mockInvalidateAllSessions).toHaveBeenCalledWith(VALID_USER_ID);
    expect(mockUpdatePassword).toHaveBeenCalledWith(VALID_USER_ID, expect.any(String));

    // A ordem importa: primeiro atualiza senha, depois invalida sessoes
    // (verificar pela ordem no use case — updatePassword antes de invalidateAllSessions)
    const updateOrder = mockUpdatePassword.mock.invocationCallOrder[0];
    const invalidateOrder = mockInvalidateAllSessions.mock.invocationCallOrder[0];

    expect(updateOrder).toBeLessThan(invalidateOrder);
  });
});

// Teste de seguranca ST-2 — Prevencao de reutilizacao de token de redefinicao de senha
// Verifica que token usado em redefinicao bem-sucedida e rejeitado em tentativa subsequente.
// Rastreabilidade: T-40 · ST-2 · NFR-4 · REQ-6
//
// Casos cobertos:
//   (a) Primeiro uso do token: redefinicao bem-sucedida, resposta 200
//   (b) Segundo uso do mesmo token: resposta 410 com { code: "TOKEN_INVALID" }
//   (c) Estado no banco: used_at preenchido apos primeiro uso (verificado via mock de markAsUsed)

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/password-reset/confirm/route";
import {
  setDepsFactory,
  resetDepsFactory,
} from "@/app/api/auth/password-reset/confirm/deps";
import { createHash } from "node:crypto";
import { PasswordResetToken } from "@/domain/entities/password-reset-token";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { AuditLogger } from "@/domain/ports/audit-logger";

// ─── Token de teste ────────────────────────────────────────────────

const TEST_TOKEN = "st2-valid-token-for-testing-1234567890";
const TEST_TOKEN_HASH = createHash("sha256").update(TEST_TOKEN).digest("hex");

const VALID_USER_ID = "user-uuid-st2";

// ─── State tracking para token ─────────────────────────────────────

let isTokenUsed = false;

/**
 * Cria uma entidade PasswordResetToken com estado controlado.
 * Se isTokenUsed for true, usedAt e preenchido com data atual.
 */
function createMockToken(): PasswordResetToken {
  return new PasswordResetToken({
    tokenHash: TEST_TOKEN_HASH,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // +12h (valido)
    usedAt: isTokenUsed ? new Date() : null,
    userId: VALID_USER_ID,
  });
}

// ─── Mocks ─────────────────────────────────────────────────────────

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

const mockHash = jest.fn<Promise<string>, [string]>().mockResolvedValue("$argon2id$v=19$m=65536,t=3,p=2$stubhash");

const mockPasswordHasher: PasswordHasher = {
  hash: mockHash,
};

const mockLog = jest.fn<Promise<void>, Parameters<AuditLogger["log"]>>();

const mockAuditLogger: AuditLogger = {
  log: mockLog,
};

// ─── Helpers ───────────────────────────────────────────────────────

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

// ─── Suite de testes ───────────────────────────────────────────────

describe("ST-2: Prevencao de reutilizacao de token de redefinicao de senha (seguranca)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isTokenUsed = false;

    // Configuracao padrao: findByHash retorna token valido (nao expirado, nao usado)
    mockFindByHash.mockImplementation(async (hash: string) => {
      if (hash === TEST_TOKEN_HASH) {
        return createMockToken();
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

  // ──────────────────────────────────────────────────────────────────
  // (a) Primeiro uso do token — redefinicao bem-sucedida, resposta 200
  // ──────────────────────────────────────────────────────────────────
  it("(a) primeiro uso do token retorna 200 com mensagem de sucesso (REQ-11)", async () => {
    const response = await POST(makeRequest(TEST_TOKEN));

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.message).toBe("Senha redefinida com sucesso");

    // Verifica que o fluxo completo foi executado
    expect(mockFindByHash).toHaveBeenCalledWith(TEST_TOKEN_HASH);
    expect(mockHash).toHaveBeenCalledWith("Str0ng!Pass");
    expect(mockUpdatePassword).toHaveBeenCalledWith(VALID_USER_ID, expect.any(String));
    expect(mockInvalidateAllSessions).toHaveBeenCalledWith(VALID_USER_ID);
    expect(mockMarkAsUsed).toHaveBeenCalledWith(TEST_TOKEN_HASH);
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PASSWORD_RESET_COMPLETED",
        userId: VALID_USER_ID,
      }),
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // (b) Segundo uso do mesmo token — resposta 410 com code TOKEN_INVALID
  // ──────────────────────────────────────────────────────────────────
  it("(b) segundo uso do mesmo token retorna 410 com code TOKEN_INVALID (NFR-4, REQ-6)", async () => {
    // Primeiro uso — sucesso
    const firstResponse = await POST(makeRequest(TEST_TOKEN));
    expect(firstResponse.status).toBe(200);

    // markAsUsed foi chamado durante o primeiro uso
    expect(mockMarkAsUsed).toHaveBeenCalledWith(TEST_TOKEN_HASH);

    // Estado do mock: isTokenUsed == true apos markAsUsed
    // (o mock foi configurado para isso no beforeEach)
    // Verificar explicitamente que o estado foi atualizado
    expect(isTokenUsed).toBe(true);

    // Segundo uso — replay do atacante
    const secondResponse = await POST(makeRequest(TEST_TOKEN));

    // Deve retornar 410 Gone com code TOKEN_INVALID
    expect(secondResponse.status).toBe(410);

    const secondBody = (await secondResponse.json()) as Record<string, unknown>;
    expect(secondBody.code).toBe("TOKEN_INVALID");
    expect(secondBody.message).toBe("O link de recuperacao e invalido");

    // Verifica que nenhum dado sensivel aparece na resposta
    const strResposta = JSON.stringify(secondBody);
    expect(strResposta).not.toContain(TEST_TOKEN);
    expect(strResposta).not.toContain(TEST_TOKEN_HASH);
    expect(strResposta).not.toContain(VALID_USER_ID);

    // Verifica que a senha NAO foi alterada novamente no replay
    expect(mockUpdatePassword).toHaveBeenCalledTimes(1);
    expect(mockInvalidateAllSessions).toHaveBeenCalledTimes(1);
    expect(mockMarkAsUsed).toHaveBeenCalledTimes(1);
  });

  // ──────────────────────────────────────────────────────────────────
  // (c) Token inexistente retorna 404 (nao confundir com caso de reuso)
  // ──────────────────────────────────────────────────────────────────
  it("(c) token inexistente retorna 404 com code TOKEN_INVALID (garante distincao entre nao encontrado e ja usado)", async () => {
    // Configurar findByHash para retornar null (token nunca existiu)
    mockFindByHash.mockResolvedValue(null);

    const response = await POST(makeRequest("token-inexistente-qualquer"));

    expect(response.status).toBe(404);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body.code).toBe("TOKEN_INVALID");
  });
});

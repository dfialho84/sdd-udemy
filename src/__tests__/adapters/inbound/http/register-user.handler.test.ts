// Testes do RegisterUserHandler — POST /api/auth/register
// Cobre os caminhos de erro HTTP 400 (campos ausentes), 409 (email duplicado), 429 (rate limit)
// Rastreabilidade: T-04 · T-07 · T-20 · REQ-2 · REQ-3 · REQ-7 · NFR-4

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import { setDepsFactory, resetDepsFactory } from "@/app/api/auth/register/deps";
import {
  RegisterUserUseCase,
  RegisterUserUseCaseError,
  type RegisterUserUseCaseDeps,
} from "@/application/use-cases/register-user.use-case";
import { registerRateLimiter } from "@/adapters/inbound/http/rate-limiter";

// Mock do RegisterUserUseCase para testes de handler (T-07)
jest.mock("@/application/use-cases/register-user.use-case", () => {
  const actual = jest.requireActual("@/application/use-cases/register-user.use-case");
  return {
    ...actual,
    RegisterUserUseCase: jest.fn(),
  };
});

const MockedRegisterUserUseCase = RegisterUserUseCase as jest.MockedClass<
  typeof RegisterUserUseCase
>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Maria Silva",
  email: "maria@example.com",
  password: "Senha@123",
  passwordConfirmation: "Senha@123",
  birthDate: "1990-01-15",
};

/** Dependências mock mínimas para injetar no handler (T-07) */
const fakeDeps = {} as RegisterUserUseCaseDeps;

describe("RegisterUserHandler — POST /api/auth/register", () => {
  beforeEach(() => {
    MockedRegisterUserUseCase.mockClear();
    // Limpar rate limiter entre testes para evitar interferência (NFR-4)
    registerRateLimiter.resetAll();
    // Injetar fábrica mock para que o handler use o MockedRegisterUserUseCase
    setDepsFactory(() => fakeDeps);
  });

  afterEach(() => {
    resetDepsFactory();
  });

  describe("HTTP 400 — campo obrigatório ausente (REQ-2)", () => {
    it("retorna 400 quando 'name' está ausente", async () => {
      const { name: _name, ...bodyWithoutName } = validBody;
      const response = await POST(makeRequest(bodyWithoutName));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toMatch(/nome/i);
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("retorna 400 quando 'email' está ausente", async () => {
      const { email: _email, ...bodyWithoutEmail } = validBody;
      const response = await POST(makeRequest(bodyWithoutEmail));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toMatch(/email/i);
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("retorna 400 quando 'password' está ausente", async () => {
      const { password: _password, passwordConfirmation: _pc, ...bodyWithoutPassword } = validBody;
      const response = await POST(makeRequest(bodyWithoutPassword));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toMatch(/senha/i);
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("retorna 400 quando 'passwordConfirmation' está ausente", async () => {
      const { passwordConfirmation: _pc, ...bodyWithoutConfirmation } = validBody;
      const response = await POST(makeRequest(bodyWithoutConfirmation));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toMatch(/confirma/i);
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("retorna 400 quando 'birthDate' está ausente", async () => {
      const { birthDate: _birthDate, ...bodyWithoutBirthDate } = validBody;
      const response = await POST(makeRequest(bodyWithoutBirthDate));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toMatch(/nascimento/i);
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("retorna 400 com estrutura padronizada quando todos os campos estão ausentes", async () => {
      const response = await POST(makeRequest({}));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toMatchObject({
        codigo: 400,
        mensagem: expect.any(String),
        requestId: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe("HTTP 400 — senha fora da política (REQ-4, T-11)", () => {
    it("retorna 400 com mensagem correta quando a senha não tem maiúsculas", async () => {
      const response = await POST(makeRequest({ ...validBody, password: "senha@123", passwordConfirmation: "senha@123" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBe(
        "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.",
      );
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("retorna 400 quando a senha tem menos de 8 caracteres", async () => {
      const response = await POST(makeRequest({ ...validBody, password: "S@1a", passwordConfirmation: "S@1a" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toContain("senha");
    });
  });

  describe("HTTP 400 — senhas divergentes (REQ-5, T-17)", () => {
    it("retorna 400 com mensagem exata quando senhas não coincidem", async () => {
      const response = await POST(makeRequest({ ...validBody, passwordConfirmation: "OutraSenha@123" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBe("As senhas não coincidem.");
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("HTTP 400 — email com formato inválido (REQ-6, T-18)", () => {
    it("retorna 400 com mensagem exata quando o email é inválido", async () => {
      const response = await POST(makeRequest({ ...validBody, email: "email-invalido" }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBe("Informe um endereço de email válido.");
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("HTTP 400 — corpo JSON inválido (REQ-7)", () => {
    it("retorna 400 quando o corpo não é JSON válido", async () => {
      const request = new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "corpo-invalido",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.requestId).toBeDefined();
    });
  });

  describe("HTTP 409 — email duplicado (REQ-3, T-07)", () => {
    it("retorna 409 quando o use case lança RegisterUserUseCaseError com código 409", async () => {
      MockedRegisterUserUseCase.mockImplementation(() => ({
        execute: jest.fn().mockRejectedValue(
          new RegisterUserUseCaseError({
            codigo: 409,
            mensagem:
              "Este email já está cadastrado. Tente fazer login ou use outro endereço.",
          }),
        ),
      }));

      const response = await POST(makeRequest(validBody));

      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json.codigo).toBe(409);
      expect(json.mensagem).toBe(
        "Este email já está cadastrado. Tente fazer login ou use outro endereço.",
      );
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("retorna estrutura padronizada { codigo, mensagem, requestId, timestamp } no erro 409", async () => {
      MockedRegisterUserUseCase.mockImplementation(() => ({
        execute: jest.fn().mockRejectedValue(
          new RegisterUserUseCaseError({
            codigo: 409,
            mensagem:
              "Este email já está cadastrado. Tente fazer login ou use outro endereço.",
          }),
        ),
      }));

      const response = await POST(makeRequest(validBody));
      const json = await response.json();

      expect(json).toMatchObject({
        codigo: 409,
        mensagem: expect.any(String),
        requestId: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe("HTTP 429 — rate limit excedido (NFR-4, T-20)", () => {
    it("retorna 429 na quarta tentativa do mesmo IP em 15 minutos", async () => {
      const ipHeader = { "x-forwarded-for": "10.0.0.1" };

      function makeRequestWithIp(body: unknown): NextRequest {
        return new NextRequest("http://localhost/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...ipHeader },
          body: JSON.stringify(body),
        });
      }

      // Configurar mock para que as 3 primeiras tentativas retornem 200 (passam pelo rate limiter)
      MockedRegisterUserUseCase.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          message: "Um link de confirmacao foi enviado ao seu email.",
        }),
      }));

      // 3 primeiras tentativas — passam pelo rate limiter
      await POST(makeRequestWithIp(validBody));
      await POST(makeRequestWithIp(validBody));
      await POST(makeRequestWithIp(validBody));

      // 4ª tentativa — deve ser bloqueada com 429 antes de qualquer processamento
      const response = await POST(makeRequestWithIp(validBody));
      expect(response.status).toBe(429);

      const json = await response.json();
      expect(json).toMatchObject({
        codigo: 429,
        mensagem: expect.any(String),
        requestId: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe("HTTP 200 — fluxo feliz (REQ-8, T-20)", () => {
    it("retorna 200 com mensagem de link enviado quando o use case tem sucesso", async () => {
      MockedRegisterUserUseCase.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          message: "Um link de confirmacao foi enviado ao seu email.",
        }),
      }));

      const response = await POST(makeRequest(validBody));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toBe("Um link de confirmacao foi enviado ao seu email.");
    });
  });
});

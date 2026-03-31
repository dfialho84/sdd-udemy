// Testes do RegisterUserHandler — POST /api/auth/register
// Cobre o caminho de erro HTTP 400 para campos obrigatórios ausentes (T-04 · IT-5 parcial)
// Rastreabilidade: T-04 · REQ-2 · REQ-7

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";

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

describe("RegisterUserHandler — POST /api/auth/register", () => {
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
});

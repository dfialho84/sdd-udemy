// Testes do schema de validacao do payload de login
// Rastreabilidade: T-02 · REQ-1 · REQ-6

import { loginPayloadSchema } from "@/lib/validation/login-payload.schema";

const validInput = {
  identifier: "alice",
  password: "Senh@1234",
};

describe("loginPayloadSchema", () => {
  describe("payload valido", () => {
    it("deve aceitar identifier como username e password preenchidos", () => {
      const result = loginPayloadSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("deve aceitar identifier como email e password preenchidos", () => {
      const result = loginPayloadSchema.safeParse({
        identifier: "alice@example.com",
        password: "Senh@1234",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("REQ-6 — identifier vazio ou ausente", () => {
    it("deve rejeitar quando identifier esta ausente", () => {
      const { identifier: _id, ...input } = validInput;
      const result = loginPayloadSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("deve rejeitar quando identifier e string vazia", () => {
      const result = loginPayloadSchema.safeParse({
        ...validInput,
        identifier: "",
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar quando identifier e apenas espacos em branco", () => {
      const result = loginPayloadSchema.safeParse({
        ...validInput,
        identifier: "   ",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("REQ-1 — password obrigatorio", () => {
    it("deve rejeitar quando password esta ausente", () => {
      const { password: _pw, ...input } = validInput;
      const result = loginPayloadSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("deve rejeitar quando password e string vazia", () => {
      const result = loginPayloadSchema.safeParse({
        ...validInput,
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("tipo de retorno", () => {
    it("deve inferir o tipo correto apos parse bem-sucedido", () => {
      const result = loginPayloadSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.identifier).toBe("string");
        expect(typeof result.data.password).toBe("string");
      }
    });
  });
});

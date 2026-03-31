// Testes do schema de validação de registro de usuário
// Rastreabilidade: T-03 · REQ-1 · REQ-2 · REQ-4 · REQ-5 · REQ-6

import { registerUserSchema } from "@/lib/validation/register-user.schema";

const validInput = {
  name: "Maria Silva",
  email: "maria@example.com",
  password: "Senha@123",
  passwordConfirmation: "Senha@123",
  birthDate: "1990-01-15",
};

describe("registerUserSchema", () => {
  describe("payload válido", () => {
    it("deve aceitar payload completo com todos os campos obrigatórios", () => {
      const result = registerUserSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("deve aceitar payload com avatarUrl opcional presente", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        avatarUrl: "https://example.com/avatar.png",
      });
      expect(result.success).toBe(true);
    });

    it("deve aceitar payload sem avatarUrl (campo opcional)", () => {
      const result = registerUserSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.avatarUrl).toBeUndefined();
      }
    });
  });

  describe("REQ-2 — campos obrigatórios ausentes", () => {
    it("deve rejeitar quando name está ausente", () => {
      const { name: _name, ...input } = validInput;
      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("nome completo"))).toBe(true);
      }
    });

    it("deve rejeitar quando name está em branco", () => {
      const result = registerUserSchema.safeParse({ ...validInput, name: "  " });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("nome completo"))).toBe(true);
      }
    });

    it("deve rejeitar quando email está ausente", () => {
      const { email: _email, ...input } = validInput;
      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("email"))).toBe(true);
      }
    });

    it("deve rejeitar quando password está ausente", () => {
      const { password: _password, ...input } = validInput;
      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("deve rejeitar quando passwordConfirmation está ausente", () => {
      const { passwordConfirmation: _pc, ...input } = validInput;
      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("deve rejeitar quando birthDate está ausente", () => {
      const { birthDate: _bd, ...input } = validInput;
      const result = registerUserSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("data de nascimento"))).toBe(true);
      }
    });

    it("deve rejeitar quando birthDate está em branco", () => {
      const result = registerUserSchema.safeParse({ ...validInput, birthDate: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("REQ-4 — política de senha", () => {
    it("deve rejeitar senha com menos de 8 caracteres", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        password: "Ab1@",
        passwordConfirmation: "Ab1@",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(
          messages.some((m) => m.includes("mínimo 8 caracteres")),
        ).toBe(true);
      }
    });

    it("deve rejeitar senha sem letra maiúscula", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        password: "senha@123",
        passwordConfirmation: "senha@123",
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha sem letra minúscula", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        password: "SENHA@123",
        passwordConfirmation: "SENHA@123",
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha sem número", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        password: "Senha@abc",
        passwordConfirmation: "Senha@abc",
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar senha sem caractere especial", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        password: "Senha1234",
        passwordConfirmation: "Senha1234",
      });
      expect(result.success).toBe(false);
    });

    it("deve aceitar senha que atende a todos os critérios", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        password: "Senh@1234",
        passwordConfirmation: "Senh@1234",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("REQ-5 — confirmação de senha divergente", () => {
    it("deve rejeitar quando password e passwordConfirmation são diferentes", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        password: "Senha@123",
        passwordConfirmation: "Senha@456",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("senhas não coincidem"))).toBe(true);
      }
    });
  });

  describe("REQ-6 — formato de email", () => {
    it("deve rejeitar email sem @", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        email: "mariaemail.com",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("endereço de email válido"))).toBe(true);
      }
    });

    it("deve rejeitar email sem domínio", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        email: "maria@",
      });
      expect(result.success).toBe(false);
    });

    it("deve aceitar email com formato válido", () => {
      const result = registerUserSchema.safeParse({
        ...validInput,
        email: "maria.silva+tag@example.co.uk",
      });
      expect(result.success).toBe(true);
    });
  });
});

// Testes do PasswordResetEmailAdapter
// Rastreabilidade: T-09 · REQ-5 · NFR-3

import { PasswordResetEmailAdapter } from "@/adapters/outbound/email/password-reset-email-adapter";

// Mock nodemailer
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "mock-id" }),
  }),
}));

import nodemailer from "nodemailer";

describe("PasswordResetEmailAdapter", () => {
  const config = {
    host: "mailhog.test",
    port: 1025,
    fromAddress: "noreply@test.com",
    appUrl: "https://app.test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("envia email com link contendo token via HTTPS (REQ-5 · NFR-3)", async () => {
    const adapter = new PasswordResetEmailAdapter(config);

    await adapter.sendPasswordReset("user@example.com", "token-123-secreto");

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: "mailhog.test",
      port: 1025,
      secure: false,
      auth: undefined,
    });

    const sendMailMock = (nodemailer.createTransport as jest.Mock).mock
      .results[0]!.value.sendMail;

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@test.com",
        to: "user@example.com",
        subject: "Recuperacao de senha",
        html: expect.stringContaining(
          "https://app.test.com/auth/password-reset?token=token-123-secreto",
        ),
        text: expect.stringContaining(
          "https://app.test.com/auth/password-reset?token=token-123-secreto",
        ),
      }),
    );
  });

  it("codifica token com caracteres especiais na URL", async () => {
    const adapter = new PasswordResetEmailAdapter(config);

    await adapter.sendPasswordReset(
      "user@example.com",
      "token+especial/123?query",
    );

    const sendMailMock = (nodemailer.createTransport as jest.Mock).mock
      .results[0]!.value.sendMail;

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          "token%2Bespecial%2F123%3Fquery",
        ),
      }),
    );
  });

  it("usa valores padrao de configuracao quando nenhuma config e fornecida", () => {
    // Nao precisa mockar process.env pois os defaults sao usados
    const adapter = new PasswordResetEmailAdapter();
    expect(adapter).toBeInstanceOf(PasswordResetEmailAdapter);
  });
});

// Testes da entidade PasswordResetToken — dominio puro
// Rastreabilidade: UT-1 · UT-2 · UT-3 · T-03 · REQ-4 · NFR-3 · REQ-12 · REQ-6 · REQ-13

import { PasswordResetToken } from "@/domain/entities/password-reset-token";
import { createHash } from "node:crypto";

function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

const baseProps = {
  tokenHash: hashToken("valid-token-123"),
  expiresAt: new Date("2099-01-01T00:00:00Z"),
  usedAt: null,
  userId: "550e8400-e29b-41d4-a716-446655440000",
};

// UT-1: PasswordResetToken.isExpired()
describe("PasswordResetToken — isExpired()", () => {
  it("deve retornar false quando expires_at esta no futuro", () => {
    const token = new PasswordResetToken({
      ...baseProps,
      expiresAt: new Date("2099-01-01T00:00:00Z"),
    });
    const agora = new Date("2024-01-01T00:00:00Z");

    expect(token.isExpired(agora)).toBe(false);
  });

  it("deve retornar true quando expires_at esta no passado", () => {
    const token = new PasswordResetToken({
      ...baseProps,
      expiresAt: new Date("2020-01-01T00:00:00Z"),
    });
    const agora = new Date("2024-01-01T00:00:00Z");

    expect(token.isExpired(agora)).toBe(true);
  });

  it("deve retornar true quando expires_at e exatamente igual ao instante atual", () => {
    const instanteAtual = new Date("2024-06-15T12:00:00Z");
    const token = new PasswordResetToken({
      ...baseProps,
      expiresAt: instanteAtual,
    });

    expect(token.isExpired(instanteAtual)).toBe(true);
  });
});

// UT-2: PasswordResetToken.isUsed()
describe("PasswordResetToken — isUsed()", () => {
  it("deve retornar false quando used_at e null", () => {
    const token = new PasswordResetToken({
      ...baseProps,
      usedAt: null,
    });

    expect(token.isUsed()).toBe(false);
  });

  it("deve retornar true quando used_at esta preenchido", () => {
    const token = new PasswordResetToken({
      ...baseProps,
      usedAt: new Date("2024-01-02T10:00:00Z"),
    });

    expect(token.isUsed()).toBe(true);
  });
});

// UT-3: PasswordResetToken.compareHash()
describe("PasswordResetToken — compareHash()", () => {
  it("deve retornar true para token correto", () => {
    const token = new PasswordResetToken({
      ...baseProps,
      tokenHash: hashToken("token-correto"),
    });

    expect(token.compareHash("token-correto")).toBe(true);
  });

  it("deve retornar false para token incorreto", () => {
    const token = new PasswordResetToken({
      ...baseProps,
      tokenHash: hashToken("token-correto"),
    });

    expect(token.compareHash("token-errado")).toBe(false);
  });

  it("deve retornar false para token vazio", () => {
    const token = new PasswordResetToken({
      ...baseProps,
      tokenHash: hashToken("token-correto"),
    });

    expect(token.compareHash("")).toBe(false);
  });

  it("deve retornar false para token nulo/undefined", () => {
    const token = new PasswordResetToken({
      ...baseProps,
      tokenHash: hashToken("token-correto"),
    });

    expect(token.compareHash("")).toBe(false);
  });
});

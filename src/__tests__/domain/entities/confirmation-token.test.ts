// Testes da entidade ConfirmationToken — domínio puro
// Rastreabilidade: UT-1 · UT-2 · T-24 · REQ-9 · REQ-12 · REQ-13 · REQ-14 · REQ-15 · NFR-3

import { ConfirmationToken, ConfirmationTokenProps } from "@/domain/entities/confirmation-token";

const baseProps: ConfirmationTokenProps = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  userId: "550e8400-e29b-41d4-a716-446655440000",
  token: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  expiresAt: new Date("2099-01-01T00:00:00Z"),
  usedAt: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
};

// UT-1: ConfirmationToken — isExpired()
describe("ConfirmationToken — isExpired()", () => {
  it("deve retornar false quando expires_at está no futuro", () => {
    const token = new ConfirmationToken({
      ...baseProps,
      expiresAt: new Date("2099-01-01T00:00:00Z"),
    });
    const agora = new Date("2024-01-01T00:00:00Z");

    expect(token.isExpired(agora)).toBe(false);
  });

  it("deve retornar true quando expires_at está no passado", () => {
    const token = new ConfirmationToken({
      ...baseProps,
      expiresAt: new Date("2020-01-01T00:00:00Z"),
    });
    const agora = new Date("2024-01-01T00:00:00Z");

    expect(token.isExpired(agora)).toBe(true);
  });

  it("deve retornar true quando expires_at é exatamente igual ao instante atual", () => {
    const instanteAtual = new Date("2024-06-15T12:00:00Z");
    const token = new ConfirmationToken({
      ...baseProps,
      expiresAt: instanteAtual,
    });

    expect(token.isExpired(instanteAtual)).toBe(true);
  });
});

// UT-2: ConfirmationToken — isUsed()
describe("ConfirmationToken — isUsed()", () => {
  it("deve retornar false quando used_at é null", () => {
    const token = new ConfirmationToken({
      ...baseProps,
      usedAt: null,
    });

    expect(token.isUsed()).toBe(false);
  });

  it("deve retornar true quando used_at está preenchido", () => {
    const token = new ConfirmationToken({
      ...baseProps,
      usedAt: new Date("2024-01-02T10:00:00Z"),
    });

    expect(token.isUsed()).toBe(true);
  });
});

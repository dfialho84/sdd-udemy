// Testes unitarios de LoginDomain — regras de negocio puras
// Cobre UT-2 (T-33), UT-3 (T-34), UT-4 (T-35), UT-5 (T-53)
// Rastreabilidade: REQ-8 · REQ-9 · REQ-11 · REQ-12 · REQ-14 · NFR-3 · NFR-4 · NFR-8

import { LoginDomain } from "@/domain/entities/login-domain";
import type { LoginBlock } from "@/domain/entities/login-attempt";

const domain = new LoginDomain();

// ─── Fixtures ──────────────────────────────────────────────────────────────

const NOW = new Date();
const FUTURE = new Date(NOW.getTime() + 10 * 60 * 1000);  // +10 min
const PAST = new Date(NOW.getTime() - 10 * 60 * 1000);    // -10 min

function makeBlock(blocked_until: Date): LoginBlock {
  return { id: "uuid", identifier: "alice", blocked_until, created_at: PAST };
}

// ─── UT-2: LoginDomain.isBlocked() (T-33) ─────────────────────────────────

describe("UT-2: LoginDomain.isBlocked()", () => {
  it("(a) retorna true quando blocked_until > now (bloqueio ativo)", () => {
    expect(domain.isBlocked(makeBlock(FUTURE))).toBe(true);
  });

  it("(b) retorna false quando blocked_until < now (bloqueio expirado)", () => {
    expect(domain.isBlocked(makeBlock(PAST))).toBe(false);
  });

  it("(c) retorna false quando block e null (sem bloqueio)", () => {
    expect(domain.isBlocked(null)).toBe(false);
  });
});

// ─── UT-3: LoginDomain.shouldActivateBlock() (T-34) ───────────────────────

describe("UT-3: LoginDomain.shouldActivateBlock()", () => {
  it("(a) retorna true quando failureCount = 3 (limite atingido, REQ-8)", () => {
    expect(domain.shouldActivateBlock(3)).toBe(true);
  });

  it("(b) retorna true quando failureCount > 3 (limite ultrapassado)", () => {
    expect(domain.shouldActivateBlock(5)).toBe(true);
    expect(domain.shouldActivateBlock(10)).toBe(true);
  });

  it("(c) retorna false quando failureCount < 3 (abaixo do limite)", () => {
    expect(domain.shouldActivateBlock(0)).toBe(false);
    expect(domain.shouldActivateBlock(1)).toBe(false);
    expect(domain.shouldActivateBlock(2)).toBe(false);
  });
});

// ─── UT-4: LoginDomain.calculateBlockExpiration() (T-35) ──────────────────

describe("UT-4: LoginDomain.calculateBlockExpiration()", () => {
  it("retorna from + 15 minutos exatos (REQ-9, NFR-4)", () => {
    const from = new Date("2026-04-18T12:00:00.000Z");
    const expected = new Date("2026-04-18T12:15:00.000Z");

    const result = domain.calculateBlockExpiration(from);

    expect(result.getTime()).toBe(expected.getTime());
  });

  it("funciona para qualquer data de entrada", () => {
    const from = new Date("2026-01-01T00:00:00.000Z");
    const result = domain.calculateBlockExpiration(from);
    const diffMinutes = (result.getTime() - from.getTime()) / (60 * 1000);

    expect(diffMinutes).toBe(15);
  });
});

// ─── UT-5: LoginDomain.shouldSendEmailWarning() (T-53) ────────────────────

describe("UT-5: LoginDomain.shouldSendEmailWarning()", () => {
  it("(a) retorna true quando usuario existe e senha incorreta (REQ-14)", () => {
    expect(domain.shouldSendEmailWarning(true, false)).toBe(true);
  });

  it("(b) retorna false quando usuario nao existe (conta nao existe — REQ-14 nao se aplica)", () => {
    expect(domain.shouldSendEmailWarning(false, false)).toBe(false);
    expect(domain.shouldSendEmailWarning(false, true)).toBe(false);
  });

  it("(c) retorna false quando senha correta (login bem-sucedido — sem aviso)", () => {
    expect(domain.shouldSendEmailWarning(true, true)).toBe(false);
  });
});

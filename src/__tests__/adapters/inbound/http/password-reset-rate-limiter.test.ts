// Testes do PasswordResetRateLimiter
// IT-6: check() com limite de 5 tentativas e desbloqueio automatico apos 1h
// Rastreabilidade: T-17 · NFR-5 · REQ-16 · REQ-17

import { PasswordResetRateLimiter } from "@/adapters/inbound/http/password-reset-rate-limiter";

const ONE_HOUR_MS = 60 * 60 * 1000;

describe("IT-6: PasswordResetRateLimiter — check() e expiracao automatica", () => {
  let mockNow: number;
  let limiter: PasswordResetRateLimiter;

  beforeEach(() => {
    mockNow = 1_700_000_000_000; // Fixed timestamp base
    limiter = new PasswordResetRateLimiter({
      now: () => mockNow,
      maxAttempts: 5,
      windowMs: ONE_HOUR_MS,
    });
  });

  afterEach(() => {
    limiter.resetAll();
  });

  it("primeiras 5 tentativas sao permitidas (REQ-16)", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await limiter.check("192.168.1.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4 - i);
    }
  });

  it("6a tentativa e bloqueada com { allowed: false } (REQ-16)", async () => {
    // 5 tentativas permitidas
    for (let i = 0; i < 5; i++) {
      await limiter.check("192.168.1.2");
    }

    // 6a tentativa bloqueada
    const result = await limiter.check("192.168.1.2");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("apos 1h da primeira tentativa o IP e desbloqueado (REQ-17)", async () => {
    const ip = "192.168.1.3";

    // 5 tentativas
    for (let i = 0; i < 5; i++) {
      await limiter.check(ip);
    }

    // Bloqueado
    const blocked = await limiter.check(ip);
    expect(blocked.allowed).toBe(false);

    // Avanca o relogio para 1h + 1ms (janela expirada)
    mockNow += ONE_HOUR_MS + 1;

    // Desbloqueado — nova janela comeca com 1 tentativa
    const result = await limiter.check(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("IPs diferentes nao compartilham contagem (bloqueio por IP)", async () => {
    // IP-1 faz 5 tentativas
    for (let i = 0; i < 5; i++) {
      await limiter.check("192.168.1.10");
    }

    // IP-1 bloqueado
    expect((await limiter.check("192.168.1.10")).allowed).toBe(false);

    // IP-2 ainda pode tentar
    expect((await limiter.check("192.168.1.20")).allowed).toBe(true);
  });

  it("retorna remaining correto apos cada tentativa", async () => {
    const ip = "192.168.1.4";

    const r1 = await limiter.check(ip);
    expect(r1.remaining).toBe(4);

    const r2 = await limiter.check(ip);
    expect(r2.remaining).toBe(3);

    const r3 = await limiter.check(ip);
    expect(r3.remaining).toBe(2);

    const r4 = await limiter.check(ip);
    expect(r4.remaining).toBe(1);

    const r5 = await limiter.check(ip);
    expect(r5.remaining).toBe(0);
  });

  it("resetAt e calculado corretamente a partir de firstAttemptAt", async () => {
    const ip = "192.168.1.5";
    const firstAttemptAt = mockNow;

    const result = await limiter.check(ip);
    expect(result.resetAt.getTime()).toBe(firstAttemptAt + ONE_HOUR_MS);
  });
});

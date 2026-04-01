// Testes unitários do RateLimiter — UT-7
// Rastreabilidade: T-49 · T-50 · NFR-4

import { RateLimiter } from "@/adapters/inbound/http/rate-limiter";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

describe("RateLimiter — UT-7", () => {
  describe("(a) primeiras 3 tentativas do mesmo IP são permitidas", () => {
    it("permite as três primeiras tentativas de um IP", () => {
      const limiter = new RateLimiter({ maxAttempts: 3, windowMs: WINDOW_MS });

      expect(limiter.check("1.2.3.4")).toBe(false); // 1ª — permitido
      expect(limiter.check("1.2.3.4")).toBe(false); // 2ª — permitido
      expect(limiter.check("1.2.3.4")).toBe(false); // 3ª — permitido
    });
  });

  describe("(b) 4ª tentativa do mesmo IP dentro de 15 minutos é bloqueada", () => {
    it("bloqueia a quarta tentativa dentro da mesma janela", () => {
      const limiter = new RateLimiter({ maxAttempts: 3, windowMs: WINDOW_MS });

      limiter.check("1.2.3.4"); // 1ª
      limiter.check("1.2.3.4"); // 2ª
      limiter.check("1.2.3.4"); // 3ª

      expect(limiter.check("1.2.3.4")).toBe(true); // 4ª — bloqueado
    });

    it("mantém o bloqueio em tentativas subsequentes dentro da janela", () => {
      const limiter = new RateLimiter({ maxAttempts: 3, windowMs: WINDOW_MS });

      limiter.check("1.2.3.4"); // 1ª
      limiter.check("1.2.3.4"); // 2ª
      limiter.check("1.2.3.4"); // 3ª

      expect(limiter.check("1.2.3.4")).toBe(true); // 4ª — bloqueado
      expect(limiter.check("1.2.3.4")).toBe(true); // 5ª — ainda bloqueado
    });
  });

  describe("(c) tentativa após expiração da janela de 15 minutos é permitida", () => {
    it("reseta o contador após a janela expirar", () => {
      let currentTime = 0;
      const limiter = new RateLimiter({
        maxAttempts: 3,
        windowMs: WINDOW_MS,
        now: () => currentTime,
      });

      // Esgotar o limite
      limiter.check("1.2.3.4"); // 1ª
      limiter.check("1.2.3.4"); // 2ª
      limiter.check("1.2.3.4"); // 3ª
      expect(limiter.check("1.2.3.4")).toBe(true); // 4ª — bloqueado

      // Avançar o tempo além da janela
      currentTime = WINDOW_MS + 1;

      // Primeira tentativa na nova janela deve ser permitida
      expect(limiter.check("1.2.3.4")).toBe(false); // nova janela — permitido
    });
  });

  describe("(d) IPs distintos não compartilham contadores", () => {
    it("contadores são independentes por IP", () => {
      const limiter = new RateLimiter({ maxAttempts: 3, windowMs: WINDOW_MS });

      // Esgotar limite do IP A
      limiter.check("1.1.1.1"); // 1ª
      limiter.check("1.1.1.1"); // 2ª
      limiter.check("1.1.1.1"); // 3ª
      expect(limiter.check("1.1.1.1")).toBe(true); // bloqueado

      // IP B não deve ser afetado
      expect(limiter.check("2.2.2.2")).toBe(false); // IP diferente — permitido
      expect(limiter.check("2.2.2.2")).toBe(false);
      expect(limiter.check("2.2.2.2")).toBe(false);
    });
  });
});

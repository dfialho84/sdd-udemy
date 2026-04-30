// Step Definitions — GH-6: Bloquear apos 3 tentativas erradas em 10 minutos
// Rastreabilidade: T-40 · REQ-8 · REQ-9 · REQ-10 · NFR-3 · NFR-4
// Scenario: "Bloquear apos 3 tentativas erradas em 10 minutos"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const TEST_PASSWORD = "Senha@1234";
const TEST_PREFIX = `t40-${Date.now()}`;

let currentUsername: string;
let currentEmail: string;
let currentUserId: string;

// ─── Given: estado inicial (usuario existe, 3 tentativas fracassadas recentes) ──

Given(
  "que o usuário {string} realizou 3 tentativas de login fracassadas nos últimos 10 minutos",
  (username: string) => {
    currentUsername = username;
    currentEmail = `${username}@example.com`;
    currentUserId = `${TEST_PREFIX}-${username}`;

    cy.task("seedFailedLoginAttempts", {
      userId: currentUserId,
      name: `Visitante ${username}`,
      username,
      email: currentEmail,
      password: TEST_PASSWORD,
      status: "active" as const,
      birthDate: "1990-01-01",
      identifier: currentUsername,
    });
  },
);

// ─── When: tenta login novamente (quarta tentativa, deve ser bloqueada) ──────────

When("o usuário tenta fazer login novamente", () => {
  // Random IP para evitar que o rate limiter (IP-based) interfira no teste
  // O bloqueio por identificador independe do IP — a janela deslizante de 10 min
  // conta as 3 falhas ja inseridas no banco.
  const uniqueIp = `10.5.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  cy.intercept("POST", "/api/auth/callback/credentials", (req) => {
    req.headers["x-forwarded-for"] = uniqueIp;
  });

  cy.visit("/login");
  cy.get('[data-testid="login-form"]').should("be.visible");

  cy.get('[data-testid="input-identifier"]').type(currentUsername);
  cy.get('[data-testid="input-password"]').type("WrongPassword@123");
  cy.get('[data-testid="submit-button"]').click();
});

// ─── Then: mensagem de bloqueio (reutilizavel em GH-7) ──────────────────────────

Then(
  "o sistema exibe mensagem de bloqueio {string}",
  (expectedMessage: string) => {
    cy.get('[data-testid="error-message"]', { timeout: 10000 })
      .should("be.visible")
      .and("contain.text", expectedMessage);
  },
);

// ─── And: verificacao de bloqueio no banco (identificador bloqueado por 15 min) ──

Then(
  "o identificador {string} é bloqueado por 15 minutos",
  (identifier: string) => {
    cy.task("getLoginBlockForIdentifier", { identifier }).then(
      (blockedUntil: string | null) => {
        expect(blockedUntil, "Login block should exist in database").to.not.be
          .null;
        if (blockedUntil) {
          const blockTime = new Date(blockedUntil).getTime();
          const now = Date.now();
          const fifteenMinutesFromNow = now + 15 * 60 * 1000;
          // Tolerancia de 2 minutos para clock drift e tempo de execucao
          const diff = Math.abs(blockTime - fifteenMinutesFromNow);
          expect(
            diff,
            `Blocked until should be ~15min from now (diff: ${diff / 1000}s)`,
          ).to.be.lessThan(2 * 60 * 1000);
        }
      },
    );
  },
);

// ─── And: usuario nao consegue fazer login (reutilizavel em GH-7) ───────────────

Then("o usuário não consegue fazer login", () => {
  // Verifica que a URL permanece na pagina de login
  cy.url({ timeout: 5000 }).should("match", /\/login(\?.*)?$/);
  // Verifica que nenhum cookie de sessao foi criado
  cy.getCookie("authjs.session-token", { timeout: 3000 }).should(
    "not.exist",
  );
});

// Step Definitions — GH-7: Tentar login durante período de bloqueio
// Rastreabilidade: T-41 · REQ-11 · REQ-10 · NFR-4
// Scenario: "Tentar login durante período de bloqueio"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// ─── Given: identificador bloqueado por tentativas erradas ─────────────────────

Given(
  "que o identificador {string} está bloqueado por tentativas erradas",
  (identifier: string) => {
    cy.task("createLoginBlock", { identifier });
  },
);

// ─── When: tenta login com identificador bloqueado (visita + preenche + clica) ──

When(
  "o usuário tenta fazer login com {string}",
  (identifier: string) => {
    // Random IP para evitar que rate limiting (IP-based) interfira no teste
    const uniqueIp = `10.7.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    cy.intercept("POST", "/api/auth/callback/credentials", (req) => {
      req.headers["x-forwarded-for"] = uniqueIp;
    });

    cy.visit("/login");
    cy.get('[data-testid="login-form"]').should("be.visible");

    cy.get('[data-testid="input-identifier"]').type(identifier);
    cy.get('[data-testid="input-password"]').type("Senha@1234");
    cy.get('[data-testid="submit-button"]').click();
  },
);

// ─── Then: mensagem de bloqueio (reutilizavel em GH-7) ─────────────────────────

Then(
  "o sistema exibe mensagem de bloqueio {string}",
  (expectedMessage: string) => {
    cy.get('[data-testid="error-message"]', { timeout: 10000 })
      .should("be.visible")
      .and("contain.text", expectedMessage);
  },
);

// ─── And: usuario nao consegue fazer login (reutilizavel em GH-7) ──────────────

Then("o usuário não consegue fazer login", () => {
  // Verifica que a URL permanece na pagina de login
  cy.url({ timeout: 5000 }).should("match", /\/login(\?.*)?$/);
  // Verifica que nenhum cookie de sessao foi criado
  cy.getCookie("authjs.session-token", { timeout: 3000 }).should(
    "not.exist",
  );
});

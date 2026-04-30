// Step Definitions — GH-4 + GH-5: Login com senha incorreta e usuario inexistente
// Rastreabilidade: T-20 · REQ-5 · REQ-7 · NFR-6 · Scenario: "Login com senha incorreta" · Scenario: "Login com usuário inexistente"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// Senha de teste compartilhada — nao usada no fluxo de falha, mas mantida para seed
const TEST_PASSWORD = "Senha@1234";
const TEST_PREFIX = `t20-${Date.now()}`;

// ─── GH-4: Given que o usuário "alice" existe ───────────────────────────────────

Given("que o usuário {string} existe", (username: string) => {
  cy.task("seedLoginUser", {
    userId: `${TEST_PREFIX}-${username}`,
    name: `Visitante ${username}`,
    username,
    email: `${username}@example.com`,
    password: TEST_PASSWORD,
    status: "active" as const,
    birthDate: "1990-01-01",
  });
});

// ─── GH-4: When preenche formulario com senha incorreta ────────────────────────

When(
  "o usuário preenche o formulário com {string} como identificador e uma senha incorreta",
  (identifier: string) => {
    // Random IP para evitar que rate limiting afete execucoes repetidas
    const uniqueIp = `10.3.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    cy.intercept("POST", "/api/auth/callback/credentials", (req) => {
      req.headers["x-forwarded-for"] = uniqueIp;
    });

    cy.visit("/login");
    cy.get('[data-testid="login-form"]').should("be.visible");

    cy.get('[data-testid="input-identifier"]').type(identifier);
    cy.get('[data-testid="input-password"]').type("WrongPassword@123");
  },
);

// ─── GH-5: When preenche formulario com identificador inexistente ──────────────

When(
  "o usuário preenche o formulário com um identificador que não existe",
  () => {
    const uniqueIp = `10.4.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    cy.intercept("POST", "/api/auth/callback/credentials", (req) => {
      req.headers["x-forwarded-for"] = uniqueIp;
    });

    cy.visit("/login");
    cy.get('[data-testid="login-form"]').should("be.visible");

    cy.get('[data-testid="input-identifier"]').type("usuario_inexistente_abc123xyz");
    cy.get('[data-testid="input-password"]').type("Senha@1234");
  },
);

// ─── And: clica no botão de login (compartilhado com todos os cenarios) ─────────

When("clica no botão de login", () => {
  cy.get('[data-testid="submit-button"]').click();
});

// ─── Then: mensagem de erro generica (reutilizavel em GH-3, GH-4, GH-5) ─────────

Then(
  "o sistema exibe mensagem de erro genérica {string}",
  (expectedMessage: string) => {
    cy.get('[data-testid="error-message"]', { timeout: 10000 })
      .should("be.visible")
      .and("contain.text", expectedMessage);
  },
);

// ─── And: permanece na pagina de login (reutilizavel em GH-3, GH-4, GH-5) ───────

Then("o usuário permanece na página de login", () => {
  cy.url({ timeout: 5000 }).should("match", /\/login$/);
});

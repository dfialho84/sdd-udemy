// Step Definitions — GH-8: Desbloquear automaticamente apos 15 minutos
// Rastreabilidade: T-46 · REQ-12 · Scenario: "Desbloquear automaticamente apos 15 minutos"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const TEST_PASSWORD = "Senha@1234";
const TEST_PREFIX = `t46-${Date.now()}`;

let currentUsername: string;
let currentEmail: string;
let currentUserId: string;

// ─── Given: bloqueio expirado + usuario active ─────────────────────────────────

Given(
  "que o identificador {string} esta bloqueado e o periodo de 15 minutos expirou",
  (identifier: string) => {
    currentUsername = identifier;
    currentEmail = `${identifier}@example.com`;
    currentUserId = `${TEST_PREFIX}-${identifier}`;

    cy.task("seedExpiredLoginBlockAndUser", {
      userId: currentUserId,
      username: currentUsername,
      email: currentEmail,
      password: TEST_PASSWORD,
    });
  },
);

// ─── When: tenta login com senha valida (visita + preenche formulario) ──────────
// O step "And clica no botao de login" (GH-1) cuida do click.

When(
  "o usuario tenta fazer login com {string} e uma senha valida",
  (identifier: string) => {
    const uniqueIp = `10.8.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    cy.intercept("POST", "/api/auth/callback/credentials", (req) => {
      req.headers["x-forwarded-for"] = uniqueIp;
    });

    cy.visit("/login");
    cy.get('[data-testid="login-form"]').should("be.visible");

    cy.get('[data-testid="input-identifier"]').type(identifier);
    cy.get('[data-testid="input-password"]').type(TEST_PASSWORD);
  },
);

// ─── And: clica no botao de login (definido localmente; GH-1 inacessivel) ──

When("clica no botao de login", () => {
  cy.get('[data-testid="submit-button"]').click();
});

// ─── Then: sistema remove o bloqueio (registro removido do banco) ────────────

Then("o sistema remove o bloqueio", () => {
  // Aguarda o login ser processado e a pagina redirecionar
  cy.url({ timeout: 15000 }).should("match", /\/users\/.+/);

  // Verifica que o registro de bloqueio foi removido do banco
  cy.task("loginBlockExistsForIdentifier", {
    identifier: currentUsername,
  }).should("be.false");
});

// ─── And: sistema reseta o contador de tentativas fracassadas ────────────────

Then("o sistema reseta o contador de tentativas fracassadas", () => {
  cy.task("getRecentFailuresCountForIdentifier", {
    identifier: currentUsername,
    windowMinutes: 10,
  }).should("eq", 0);
});

// ─── And: usuario consegue fazer login com sucesso ───────────────────────────

Then("o usuario consegue fazer login com sucesso", () => {
  // Verifica que a sessao foi criada (cookie de sessao existe)
  cy.getCookie("authjs.session-token", { timeout: 10000 }).should("exist");
  // Verifica que o redirecionamento ocorreu para a area pessoal
  cy.url({ timeout: 10000 }).should("include", `/users/${currentUserId}`);
});

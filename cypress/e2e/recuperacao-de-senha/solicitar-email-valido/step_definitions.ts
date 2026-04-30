// Step Definitions — GH-1: Solicitar recuperacao com email valido
// Rastreabilidade: T-30 · REQ-1 · REQ-2 · REQ-3
// Scenario: "Solicitar recuperacao com email valido"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const TEST_USER_ID = `gh1-pwd-reset-${Date.now()}`;
const TEST_USERNAME = `gh1pwdreset${Date.now()}`;
const TEST_EMAIL = `gh1-pwd-reset-${Date.now()}@example.com`;

// Setup: insere usuario ativo no banco antes do cenario
before(() => {
  cy.task("seedActiveUserForPasswordReset", {
    userId: TEST_USER_ID,
    username: TEST_USERNAME,
    email: TEST_EMAIL,
  });
});

// Teardown: remove usuario de teste apos o cenario
after(() => {
  cy.task("cleanupPasswordResetTestUser", { userId: TEST_USER_ID });
});

// Step 1: Given que o usuario esta na tela de login
Given("que o usuario esta na tela de login", () => {
  cy.visit("/login");
  cy.get('[data-testid="login-form"]').should("be.visible");
});

// Step 2: When o usuario clica em "Esqueci a senha"
When('o usuario clica em "Esqueci a senha"', () => {
  cy.contains("a", "Esqueci a senha").click();
  cy.url().should("include", "/esqueci-senha");
});

// Step 3: Then o sistema exibe um formulario com campo de email
Then("o sistema exibe um formulario com campo de email", () => {
  cy.get('[data-testid="esqueci-senha-form"]').should("be.visible");
  cy.get('[data-testid="input-email"]').should("be.visible");
});

// Step 4: And o usuario consegue informar seu email e submeter
Then("o usuario consegue informar seu email e submeter", () => {
  // Intercepta o POST para verificar a resposta 200
  cy.intercept("POST", "/api/auth/password-reset*").as("passwordResetRequest");

  cy.get('[data-testid="input-email"]').type(TEST_EMAIL);
  cy.get('[data-testid="submit-button"]').click();

  // Verifica resposta 200 com mensagem generica (REQ-2)
  cy.wait("@passwordResetRequest").then((interception) => {
    expect(interception.response?.statusCode).to.eq(200);
  });

  // Verifica que a mensagem generica e exibida (REQ-2)
  cy.contains(
    "Se existe conta com esse email, voce recebera um link de recuperacao",
    { timeout: 10000 },
  ).should("be.visible");
});

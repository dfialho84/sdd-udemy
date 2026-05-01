// Step Definitions — GH-6: Solicitar recuperacao com email inexistente
// Rastreabilidade: T-35 · REQ-2 · REQ-14 · REQ-15
// Scenario: "Solicitar recuperacao com email inexistente"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const TEST_EMAIL = `gh6-inexistente-${Date.now()}@example.com`;
const TEST_TIMESTAMP = Date.now();

// Nenhum setup necessario — email nao existe no banco (anti-enumeracao)

// Step 1: Given que o usuario esta na tela de formulario de recuperacao
Given("que o usuario esta na tela de formulario de recuperacao", () => {
  cy.visit("/esqueci-senha");
  cy.get('[data-testid="esqueci-senha-form"]').should("be.visible");
});

// Step 2: When o usuario informa um email que nao existe no sistema
When("o usuario informa um email que nao existe no sistema", () => {
  cy.get('[data-testid="input-email"]').type(TEST_EMAIL);
});

// Step 3: And o usuario submete o formulario
When("o usuario submete o formulario", () => {
  cy.intercept("POST", "/api/auth/password-reset*").as("passwordResetRequest");
  cy.get('[data-testid="submit-button"]').click();
});

// Step 4: Then o sistema nao revela se o email existe ou nao
Then("o sistema nao revela se o email existe ou nao", () => {
  cy.wait("@passwordResetRequest").then((interception) => {
    // Deve retornar 200 (nao 404) — REQ-14 anti-enumeracao
    expect(interception.response?.statusCode).to.eq(200);
  });
});

// Step 5: And o sistema exibe mensagem generica "..."
Then("o sistema exibe mensagem generica {string}", (mensagem: string) => {
  cy.contains(mensagem, { timeout: 10000 }).should("be.visible");
});

// Step 6: And o sistema oferece um link para a pagina de cadastro
// O link tem texto "Crie uma conta" e aponta para /register (REQ-15)
Then("o sistema oferece um link para a pagina de cadastro", () => {
  cy.contains("a", "Crie uma conta").should("be.visible");
  cy.get('a[href="/register"]').should("be.visible");
});

// Step 7: And nenhum email e enviado
Then("nenhum email e enviado", () => {
  // Verifica que nenhum token de redefinicao foi criado (anti-enumeracao - REQ-14)
  cy.task("countPasswordResetTokensSince", { since: TEST_TIMESTAMP }).then((count) => {
    expect(count).to.eq(0);
  });
});

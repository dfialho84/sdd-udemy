// Step Definitions — GH-2: Receber email com link valido
// Rastreabilidade: T-31 · REQ-4 · REQ-5
// Scenario: "Receber email com link valido"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const TEST_USER_ID = `gh2-pwd-reset-${Date.now()}`;
const TEST_USERNAME = `gh2pwdreset${Date.now()}`;
const TEST_EMAIL = `gh2-pwd-reset-${Date.now()}@example.com`;

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

// Step 1: Given que um usuario solicitou recuperacao de senha com email valido
Given("que um usuario solicitou recuperacao de senha com email valido", () => {
  cy.intercept("POST", "/api/auth/password-reset*").as("passwordResetRequest");

  cy.request({
    method: "POST",
    url: "/api/auth/password-reset",
    body: { email: TEST_EMAIL },
    headers: { "Content-Type": "application/json" },
  }).as("solicitacaoResponse");
});

// Step 2: When o sistema processa a solicitacao
When("o sistema processa a solicitacao", () => {
  // Aguarda a resposta da solicitacao (fire-and-forget, mas a resposta HTTP ja e sincrona)
  cy.get("@solicitacaoResponse").its("status").should("eq", 200);
});

// Step 3: Then o sistema envia um email contendo um link unico de recuperacao
Then("o sistema envia um email contendo um link unico de recuperacao", () => {
  // Verifica que a solicitacao foi bem-sucedida (200)
  cy.get("@solicitacaoResponse").then((response: any) => {
    expect(response.status).to.eq(200);
  });

  // Verifica que o token foi persistido no banco (fire-and-forget, o token e a prova do "email enviado")
  cy.task<string | null>("findPasswordResetTokenByUserId", { userId: TEST_USER_ID }).then(
    (tokenHash) => {
      expect(tokenHash).to.not.be.null;
    },
  );
});

// Step 4: And o link contem um token com expiracao de 12 horas
Then("o link contem um token com expiracao de 12 horas", () => {
  cy.task<{ tokenHash: string; expiresAt: string; createdAt: string } | null>(
    "findPasswordResetTokenByUserIdWithTimestamps",
    { userId: TEST_USER_ID },
  ).then((token) => {
    expect(token).to.not.be.null;

    const expiresAt = new Date(token!.expiresAt).getTime();
    const createdAt = new Date(token!.createdAt).getTime();
    const diffHours = (expiresAt - createdAt) / (1000 * 60 * 60);

    // Aceita uma pequena tolerancia (até 1 minuto) para o tempo de processamento
    expect(diffHours).to.be.greaterThan(11.9);
    expect(diffHours).to.be.lessThan(12.1);
  });
});

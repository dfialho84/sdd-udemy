// Step Definitions — GH-1: Cadastro realizado com dados validos
// Rastreabilidade: T-22 · REQ-1 · REQ-8 · REQ-9 · Scenario: "Cadastro realizado com dados validos"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// Email unico por execucao para evitar colisao com outros testes
const testEmail = `gh1-${Date.now()}@example.com`;

Given("que o visitante esta na pagina de cadastro", () => {
  cy.visit("/register");
  cy.get('[data-testid="register-form"]').should("be.visible");
});

When(
  "o visitante preenche todos os campos obrigatorios com dados validos e envia o formulario",
  () => {
    cy.get('[data-testid="input-name"]').type("Visitante Teste GH1");
    cy.get('[data-testid="input-email"]').type(testEmail);
    cy.get('[data-testid="input-password"]').type("Senha@1234");
    cy.get('[data-testid="input-password-confirmation"]').type("Senha@1234");
    cy.get('[data-testid="input-birth-date"]').type("1990-06-15");
    cy.get('[data-testid="submit-button"]').click();
  },
);

Then(
  "o visitante ve uma tela informando que um link de confirmacao foi enviado ao seu email",
  () => {
    cy.get('[data-testid="success-message"]', { timeout: 15000 }).should("be.visible");
    cy.get('[data-testid="success-message"]').should(
      "contain.text",
      "Um link de confirmacao foi enviado ao seu email",
    );
  },
);

Then("o sistema envia um email de confirmacao ao endereco informado", () => {
  // Consulta a API do Mailhog para verificar presenca do email de confirmacao
  // A API do Mailhog expoe mensagens em http://localhost:8025/api/v2/messages
  cy.request({
    method: "GET",
    url: "http://localhost:8025/api/v2/messages",
    timeout: 10000,
  }).then((response) => {
    expect(response.status).to.eq(200);
    const messages = response.body.items as Array<{
      Content: { Headers: { To: string[] } };
      Raw: { Data: string };
    }>;

    // Procura por email destinado ao endereco informado no formulario
    const confirmationEmail = messages.find((msg) =>
      msg.Content.Headers.To.some((to) => to.includes(testEmail)),
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expect(confirmationEmail, `Email de confirmacao para ${testEmail} nao encontrado no Mailhog`).to
      .not.be.undefined;

    // Verifica que o email contem o link de confirmacao.
    // O conteudo do email e codificado em quoted-printable pelo nodemailer,
    // portanto verificamos "/api/auth/confirm?" que aparece intacto antes
    // da quebra de linha de encoding (o "?" nao e codificado por QP).
    expect(confirmationEmail!.Raw.Data).to.include("/api/auth/confirm?");
  });
});

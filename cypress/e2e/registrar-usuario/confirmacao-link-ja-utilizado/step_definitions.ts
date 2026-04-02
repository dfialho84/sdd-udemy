// Step Definitions — GH-5: Confirmacao de cadastro com link ja utilizado
// Rastreabilidade: T-47 · REQ-14 · REQ-15 · Scenario: "Confirmacao de cadastro com link ja utilizado"

import { Given, When, Then, Before, After } from "@badeball/cypress-cucumber-preprocessor";

// IDs e token unicos por execucao para evitar colisao com outros testes
const userId = crypto.randomUUID();
const tokenId = crypto.randomUUID();
const tokenValue = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join(""); // 32 hex chars
const testEmail = `gh5-${Date.now()}@example.com`;

// Resposta do endpoint de confirmacao com token ja utilizado
let confirmResponse: Cypress.Response<{
  codigo?: number;
  mensagem?: string;
  requestId?: string;
  timestamp?: string;
}>;

// Insere usuario active + token ja utilizado no banco antes do cenario
Before({ tags: "@gh5" }, () => {
  cy.task("cleanupTestUsers", { emailPrefix: "gh5-" });
  cy.task("seedUsedToken", {
    userId,
    tokenId,
    email: testEmail,
    tokenValue,
  });
});

// Remove registros de teste apos o cenario
After({ tags: "@gh5" }, () => {
  cy.task("cleanupTestUsers", { emailPrefix: "gh5-" });
});

/**
 * GH-5 — Given: visitante possui conta ativada apos clicar no link de confirmacao
 *
 * O setup real e feito no hook Before acima via cy.task.
 * Este step apenas inicializa o contexto do Cypress.
 */
Given(
  "que o visitante possui uma conta ativada apos clicar no link de confirmacao",
  () => {
    // Setup ja realizado pelo hook Before — inicializa contexto do Cypress com failOnStatusCode: false
    // pois a rota raiz pode nao existir no ambiente de teste de API
    cy.visit("/", { failOnStatusCode: false });
  },
);

/**
 * GH-5 — When: visitante tenta acessar o mesmo link de confirmacao novamente
 *
 * Acessa GET /api/auth/confirm?token=<valor ja utilizado> via cy.request
 */
When("o visitante tenta acessar o mesmo link de confirmacao novamente", () => {
  cy.request({
    method: "GET",
    url: `/api/auth/confirm?token=${tokenValue}`,
    failOnStatusCode: false,
  }).then((response) => {
    confirmResponse = response as typeof confirmResponse;
  });
});

/**
 * GH-5 — Then: sistema exibe mensagem informando que o link ja foi utilizado
 *
 * Verifica HTTP 409 e presenca de mensagem de link ja utilizado (REQ-14)
 */
Then(
  "o sistema exibe mensagem informando que o link de confirmacao ja foi utilizado",
  () => {
    expect(confirmResponse.status).to.eq(409);
    expect(confirmResponse.body.codigo).to.eq(409);
    expect(confirmResponse.body.mensagem).to.be.a("string");
    expect(confirmResponse.body.mensagem.toLowerCase()).to.include("utilizado");
  },
);

/**
 * GH-5 — And: sistema nao altera o status da conta
 *
 * Verifica via cy.task que o usuario ainda esta com status "active" (REQ-15)
 */
Then("o sistema nao altera o status da conta", () => {
  cy.task("getUserStatus", { userId }).should("eq", "active");
});

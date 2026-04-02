// Step Definitions — GH-4: Confirmacao de cadastro com link expirado
// Rastreabilidade: T-45 · REQ-12 · REQ-13 · Scenario: "Confirmacao de cadastro com link expirado"

import { Given, When, Then, Before, After } from "@badeball/cypress-cucumber-preprocessor";

// IDs e token unicos por execucao para evitar colisao com outros testes
const userId = crypto.randomUUID();
const tokenId = crypto.randomUUID();
const tokenValue = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join(""); // 32 hex chars
const testEmail = `gh4-${Date.now()}@example.com`;

// Resposta do endpoint de confirmacao com token expirado
let confirmResponse: Cypress.Response<{
  codigo?: number;
  mensagem?: string;
  requestId?: string;
  timestamp?: string;
  registerUrl?: string;
}>;

// Insere usuario pending + token expirado no banco antes do cenario
Before({ tags: "@gh4" }, () => {
  cy.task("cleanupTestUsers", { emailPrefix: "gh4-" });
  cy.task("seedExpiredToken", {
    userId,
    tokenId,
    email: testEmail,
    tokenValue,
  });
});

// Remove registros de teste apos o cenario
After({ tags: "@gh4" }, () => {
  cy.task("cleanupTestUsers", { emailPrefix: "gh4-" });
});

/**
 * GH-4 — Given: visitante possui cadastro "pendente" com link gerado ha mais de 24 horas
 *
 * O setup real e feito no hook Before acima via cy.task.
 * Este step apenas inicializa o contexto do Cypress.
 */
Given(
  "que um visitante possui um cadastro com status {string} e cujo link de confirmacao foi gerado ha mais de 24 horas",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_status: string) => {
    // Setup ja realizado pelo hook Before — inicializa contexto do Cypress com failOnStatusCode: false
    // pois a rota raiz pode nao existir no ambiente de teste de API
    cy.visit("/", { failOnStatusCode: false });
  },
);

/**
 * GH-4 — When: visitante acessa o link de confirmacao expirado
 *
 * Acessa GET /api/auth/confirm?token=<valor expirado> via cy.request
 */
When("o visitante acessa o link de confirmacao expirado", () => {
  cy.request({
    method: "GET",
    url: `/api/auth/confirm?token=${tokenValue}`,
    failOnStatusCode: false,
  }).then((response) => {
    confirmResponse = response as typeof confirmResponse;
  });
});

/**
 * GH-4 — Then: sistema exibe mensagem informando que o link expirou
 *
 * Verifica HTTP 410 e presenca de mensagem de link expirado (REQ-13)
 */
Then(
  "o sistema exibe mensagem informando que o link expirou e que o cadastro deve ser realizado novamente",
  () => {
    expect(confirmResponse.status).to.eq(410);
    expect(confirmResponse.body.codigo).to.eq(410);
    expect(confirmResponse.body.mensagem).to.be.a("string");
    expect(confirmResponse.body.mensagem).to.include("expirou");
  },
);

/**
 * GH-4 — And: cadastro pendente associado ao link e removido automaticamente
 *
 * Verifica via cy.task que o usuario foi removido do banco (REQ-12)
 */
Then("o cadastro pendente associado ao link e removido automaticamente", () => {
  cy.task("userExistsById", { userId }).should("eq", false);
});

/**
 * GH-4 — And: visitante e redirecionado para a pagina de cadastro
 *
 * Verifica presenca de registerUrl na resposta apontando para /register (REQ-13)
 */
Then("o visitante e redirecionado para a pagina de cadastro", () => {
  expect(confirmResponse.body.registerUrl).to.be.a("string");
  expect(confirmResponse.body.registerUrl).to.include("/register");
});

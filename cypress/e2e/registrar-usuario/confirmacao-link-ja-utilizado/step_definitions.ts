// Step Definitions — GH-5: Confirmacao de cadastro com link ja utilizado
// Rastreabilidade: T-47 · REQ-14 · REQ-15 · Scenario: "Confirmacao de cadastro com link ja utilizado"
//
// Correcao: o endpoint GET /api/auth/confirm retorna HTTP 302 Redirect para
// /confirm?error=already_confirmed (nao HTTP 409 com JSON). Os steps agora usam cy.visit
// para seguir o redirect e verificam o conteudo HTML da pagina /confirm.

import { Given, When, Then, Before, After } from "@badeball/cypress-cucumber-preprocessor";

// IDs e token unicos por execucao para evitar colisao com outros testes
const userId = crypto.randomUUID();
const tokenId = crypto.randomUUID();
const tokenValue = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join(""); // 32 hex chars
const testEmail = `gh5-${Date.now()}@example.com`;

// (variavel de resposta removida — agora usamos cy.visit e verificamos o DOM)

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
 * Usa cy.visit para seguir o HTTP 302 Redirect para /confirm?error=already_confirmed,
 * simulando o comportamento real do usuario que reutiliza o link no email.
 */
When("o visitante tenta acessar o mesmo link de confirmacao novamente", () => {
  // cy.visit segue automaticamente o redirect 302 do endpoint para /confirm?error=already_confirmed
  cy.visit(`/api/auth/confirm?token=${tokenValue}`);
});

/**
 * GH-5 — Then: sistema exibe mensagem informando que o link ja foi utilizado
 *
 * Verifica conteudo HTML da pagina /confirm?error=already_confirmed (REQ-14).
 * A pagina exibe: "Esta conta ja foi confirmada."
 */
Then(
  "o sistema exibe mensagem informando que o link de confirmacao ja foi utilizado",
  () => {
    // Verifica que o redirect levou para /confirm com error=already_confirmed
    cy.url().should("include", "/confirm");
    cy.url().should("include", "error=already_confirmed");

    // Verifica conteudo da pagina — mensagem de link ja utilizado
    cy.contains("Esta conta já foi confirmada.").should("be.visible");
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

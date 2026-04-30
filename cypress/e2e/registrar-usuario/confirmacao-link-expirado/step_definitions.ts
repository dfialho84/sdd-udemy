// Step Definitions — GH-4: Confirmacao de cadastro com link expirado
// Rastreabilidade: T-45 · REQ-12 · REQ-13 · Scenario: "Confirmacao de cadastro com link expirado"
//
// Correcao: o endpoint GET /api/auth/confirm retorna HTTP 302 Redirect para /confirm?error=expired
// (nao HTTP 410 com JSON). Os steps agora usam cy.visit para seguir o redirect e verificam
// o conteudo HTML da pagina /confirm renderizada pelo Next.js.

import { Given, When, Then, Before, After } from "@badeball/cypress-cucumber-preprocessor";

// IDs e token unicos por execucao para evitar colisao com outros testes
const userId = crypto.randomUUID();
const tokenId = crypto.randomUUID();
const tokenValue = Array.from(crypto.getRandomValues(new Uint8Array(16)))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join(""); // 32 hex chars
const testEmail = `gh4-${Date.now()}@example.com`;

// (variavel de resposta removida — agora usamos cy.visit e verificamos o DOM)

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
   
  (_status: string) => {
    // Setup ja realizado pelo hook Before — inicializa contexto do Cypress com failOnStatusCode: false
    // pois a rota raiz pode nao existir no ambiente de teste de API
    cy.visit("/", { failOnStatusCode: false });
  },
);

/**
 * GH-4 — When: visitante acessa o link de confirmacao expirado
 *
 * Usa cy.visit para seguir o HTTP 302 Redirect para /confirm?error=expired,
 * simulando o comportamento real do usuario que clica no link no email.
 */
When("o visitante acessa o link de confirmacao expirado", () => {
  // cy.visit segue automaticamente o redirect 302 do endpoint para /confirm?error=expired
  cy.visit(`/api/auth/confirm?token=${tokenValue}`);
});

/**
 * GH-4 — Then: sistema exibe mensagem informando que o link expirou
 *
 * Verifica conteudo HTML da pagina /confirm?error=expired (REQ-13).
 * A pagina exibe: "Este link de confirmacao expirou."
 */
Then(
  "o sistema exibe mensagem informando que o link expirou e que o cadastro deve ser realizado novamente",
  () => {
    // Verifica que o redirect levou para /confirm com error=expired
    cy.url().should("include", "/confirm");
    cy.url().should("include", "error=expired");

    // Verifica conteudo da pagina — mensagem de link expirado
    cy.contains("Este link de confirmação expirou.").should("be.visible");
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
 * Verifica presenca do link "Novo cadastro" apontando para /register na pagina /confirm (REQ-13).
 */
Then("o visitante e redirecionado para a pagina de cadastro", () => {
  cy.get('a[href="/register"]').should("be.visible");
  cy.get('a[href="/register"]').should("contain.text", "Novo cadastro");
});

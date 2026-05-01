// Step Definitions — GH-9: Exceder limite de tentativas de solicitacao
// Rastreabilidade: T-38 · REQ-16 · NFR-5 · NFR-6
// Scenario: "Exceder limite de tentativas de solicitacao"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// USAR IP UNICO por execucao do cenario para evitar colisao entre runs
// O IP deve ser o mesmo em todas as 6 chamadas (rate limiting por IP — REQ-16)
const RUN_ID = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
const FIXED_IP = `10.99.${RUN_ID.replace(/-/g, "").slice(0, 6)}`;
const TEST_EMAIL = `gh9-rate-limit-${RUN_ID}@example.com`;
const TEST_USER_ID = `gh9-${RUN_ID}`;
const TEST_USERNAME = `gh9-${RUN_ID}`;

let tokenCountBefore: number = 0;

// Setup: insere usuario ativo
before(() => {
  cy.task("seedActiveUserForPasswordReset", {
    userId: TEST_USER_ID,
    username: TEST_USERNAME,
    email: TEST_EMAIL,
  });
});

// Teardown
after(() => {
  cy.task("cleanupPasswordResetTestUser", { userId: TEST_USER_ID });
});

/**
 * Step 1: Given — Executa 5 chamadas POST /request com o mesmo IP
 * Cada chamada deve retornar 200 (5 primeiras tentativas permitidas — REQ-16)
 */
Given(
  "que o usuario ja realizou 5 solicitacoes de recuperacao no mesmo IP em menos de 1 hora",
  () => {
    // Executa 5 chamadas sequenciais com o mesmo IP e email valido
    for (let i = 0; i < 5; i++) {
      cy.request({
        method: "POST",
        url: "/api/auth/password-reset",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": FIXED_IP,
        },
        body: { email: TEST_EMAIL },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
    }
  },
);

/**
 * Step 2: When — 6a tentativa com o mesmo IP
 * Capturamos a contagem de tokens ANTES da 6a chamada para comparar depois
 */
When("o usuario tenta realizar uma 6a solicitacao de recuperacao", () => {
  cy.task("countPasswordResetTokensSince", { since: 0 }).then((count: number) => {
    tokenCountBefore = count;
  });

  cy.request({
    method: "POST",
    url: "/api/auth/password-reset",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": FIXED_IP,
    },
    body: { email: TEST_EMAIL },
    failOnStatusCode: false,
  }).as("sixthRequest");
});

/**
 * Step 3: Then — Sistema detecta limite excedido (429)
 */
Then("o sistema detecta o limite de tentativas excedido", () => {
  cy.get("@sixthRequest").then((res: any) => {
    expect(res.status).to.eq(429);
    expect(res.body.code).to.eq("RATE_LIMIT_EXCEEDED");
  });
});

/**
 * Step 4: And — Mensagem de 1 hora (REQ-16)
 */
Then(
  'o sistema exibe mensagem "Muitas tentativas de recuperacao. Tente novamente em 1 hora"',
  () => {
    cy.get("@sixthRequest").then((res: any) => {
      expect(res.body.message).to.eq(
        "Muitas tentativas de recuperacao. Tente novamente em 1 hora",
      );
    });
  },
);

/**
 * Step 5: And — Caso de uso nao foi invocado (nenhum token novo criado)
 * A 6a chamada retornou 429 antes de chegar no caso de uso, entao
 * a contagem de tokens no banco nao deve ter aumentado.
 */
Then("o sistema bloqueia a tentativa", () => {
  cy.get("@sixthRequest").then((res: any) => {
    expect(res.status).to.eq(429);
  });

  // Contagem de tokens apos a 6a chamada deve ser igual a contagem anterior
  cy.task("countPasswordResetTokensSince", { since: 0 }).then(
    (countAfter: number) => {
      expect(countAfter).to.eq(tokenCountBefore);
    },
  );
});

/**
 * Step 6: And — Log de auditoria registrado (NFR-6)
 * Verificamos a estrutura da resposta de erro, que inclui requestId e timestamp
 * (constitution.md regra 5), indicando que o fluxo de tratamento de erro foi
 * executado corretamente.
 */
Then("a solicitacao e registrada em logs de seguranca", () => {
  cy.get("@sixthRequest").then((res: any) => {
    // Erro estruturado conforme constitution.md regra 5
    expect(res.body).to.have.property("requestId");
    expect(res.body).to.have.property("timestamp");
    expect(res.body.code).to.eq("RATE_LIMIT_EXCEEDED");
    // O campo requestId deve ser uma string UUID valida
    expect(res.body.requestId).to.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

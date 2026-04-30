// Step Definitions — GH-9: Email de aviso para senha incorreta
// Rastreabilidade: T-56 · REQ-14 · REQ-5 · REQ-7 · NFR-8
// Scenario: "Email de aviso para senha incorreta"

import { Given, When, Then, Before } from "@badeball/cypress-cucumber-preprocessor";

const TEST_PASSWORD = "Senha@1234";
const TEST_PREFIX = `t56-${Date.now()}`;
const MAILHOG_API_URL = "http://localhost:8025";

// Limpa a caixa do Mailhog antes de cada execucao para garantir inbox limpa
Before(() => {
  cy.request({
    method: "DELETE",
    url: `${MAILHOG_API_URL}/api/v1/messages`,
    failOnStatusCode: false,
  });
});

// ─── Given: usuario alice existe com email especifico ────────────────────────

Given(
  "que o usuário {string} existe com email {string} cadastrado",
  (username: string, email: string) => {
    cy.task("seedLoginUser", {
      userId: `${TEST_PREFIX}-${username}`,
      name: `Visitante ${username}`,
      username,
      email,
      password: TEST_PASSWORD,
      status: "active" as const,
      birthDate: "1990-01-01",
    });
  },
);

// ─── When: preenche formulario com senha incorreta ────────────────────────────

When(
  "o usuário preenche o formulário com {string} como identificador e uma senha incorreta",
  (identifier: string) => {
    // IP aleatorio para evitar que rate limiting por IP interfira no teste
    const uniqueIp = `10.9.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    cy.intercept("POST", "/api/auth/callback/credentials", (req) => {
      req.headers["x-forwarded-for"] = uniqueIp;
    });

    cy.visit("/login");
    cy.get('[data-testid="login-form"]').should("be.visible");

    cy.get('[data-testid="input-identifier"]').type(identifier);
    cy.get('[data-testid="input-password"]').type("WrongPassword@123");
  },
);

// ─── And: clica no botao de login ─────────────────────────────────────────────

When("clica no botão de login", () => {
  cy.get('[data-testid="submit-button"]').click();
});

// ─── Then: sistema enviou email de aviso ao destinatario correto ──────────────
// Consulta Mailhog API com retries (ate 5 min conforme NFR-8 / PT-3)
// Em CI usa timeout menor (30s) pois o email e fire-and-forget imediato.

Then(
  "o sistema envia um email de aviso para {string} alertando sobre a tentativa de login falhada",
  (expectedEmail: string) => {
    // Tenta ate 10 vezes com intervalo de 3 segundos (30s total)
    // O envio e fire-and-forget — o email deve ser entregue em poucos segundos
    const maxRetries = 10;
    const retryIntervalMs = 3000;

    function tryFetchEmail(retriesLeft: number): Cypress.Chainable {
      return cy
        .request({
          method: "GET",
          url: `${MAILHOG_API_URL}/api/v2/messages`,
          failOnStatusCode: true,
        })
        .then((response) => {
          const messages = response.body.items as Array<{
            Content: { Headers: Record<string, string[]> };
          }>;

          const found = messages.find((msg) => {
            const toHeader = msg.Content.Headers["To"]?.[0] ?? "";
            return toHeader.includes(expectedEmail);
          });

          if (found) {
            // Email encontrado — verificar que o assunto indica tentativa de login
            const subject = found.Content.Headers["Subject"]?.[0] ?? "";
            expect(
              subject.toLowerCase(),
              `Assunto do email deve conter "login", mas foi: "${subject}"`,
            ).to.include("login");
          } else if (retriesLeft > 0) {
            // Email ainda nao chegou — aguardar e tentar novamente
            cy.wait(retryIntervalMs);
            return tryFetchEmail(retriesLeft - 1);
          } else {
            // Esgotou retries — falhar com mensagem clara
            throw new Error(
              `Email de aviso para "${expectedEmail}" nao foi encontrado no Mailhog apos ${maxRetries} tentativas`,
            );
          }
        });
    }

    tryFetchEmail(maxRetries);
  },
);

// ─── And: mensagem de erro generica ──────────────────────────────────────────

Then(
  "o sistema exibe mensagem de erro genérica {string}",
  (expectedMessage: string) => {
    cy.get('[data-testid="error-message"]', { timeout: 10000 })
      .should("be.visible")
      .and("contain.text", expectedMessage);
  },
);

// ─── And: permanece na pagina de login ────────────────────────────────────────

Then("o usuário permanece na página de login", () => {
  cy.url({ timeout: 5000 }).should("match", /\/login$/);
});

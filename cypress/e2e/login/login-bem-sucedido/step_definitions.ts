// Step Definitions — GH-1 + GH-2: Login bem-sucedido com usuario e com email
// Rastreabilidade: T-16 · REQ-2 · REQ-3 · REQ-4 · Scenario: "Login bem-sucedido com usuário" · Scenario: "Login bem-sucedido com email"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// Senha de teste compartilhada entre os cenarios GH-1 e GH-2
const TEST_PASSWORD = "Senha@1234";

// Prefixo para identificadores de teste — permite limpeza seletiva apos cada cenario
const TEST_PREFIX = `t16-${Date.now()}`;

// ─── GH-1: "Login bem-sucedido com usuário" ────────────────────────────────────

let currentUsername: string;
let currentEmail: string;
let currentUserId: string;

Given("que o usuário {string} existe com senha válida", (username: string) => {
  currentUsername = username;
  currentEmail = `${username}@example.com`;
  currentUserId = `${TEST_PREFIX}-gh1`;

  // Via task do Cypress, insere usuario active com hash argon2id da senha de teste
  cy.task("seedLoginUser", {
    userId: currentUserId,
    name: `Visitante ${username}`,
    username,
    email: currentEmail,
    password: TEST_PASSWORD,
    status: "active" as const,
    birthDate: "1990-01-01",
  });
});

// ─── GH-2: "Login bem-sucedido com email" ─────────────────────────────────────

Given(
  "que o usuário com email {string} existe com senha válida",
  (email: string) => {
    const emailLocal = email.split("@")[0] ?? "visitante";
    currentUsername = `${TEST_PREFIX}-${emailLocal}`;
    currentEmail = email;
    currentUserId = `${TEST_PREFIX}-gh2`;

    cy.task("seedLoginUser", {
      userId: currentUserId,
      name: `Visitante ${emailLocal}`,
      username: currentUsername,
      email: currentEmail,
      password: TEST_PASSWORD,
      status: "active" as const,
      birthDate: "1990-01-01",
    });
  },
);

// ─── When (compartilhado GH-1 e GH-2) ─────────────────────────────────────────

When(
  "o usuário preenche o formulário com {string} como identificador e a senha correta",
  (identifier: string) => {
    // Intercepta o POST de login para evitar rate-limiting entre execucoes
    const uniqueIp = `10.2.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    cy.intercept("POST", "/api/auth/callback/credentials", (req) => {
      req.headers["x-forwarded-for"] = uniqueIp;
    });

    cy.visit("/login");
    cy.get('[data-testid="login-form"]').should("be.visible");

    // Preenche o formulario com o identificador e a senha de teste
    cy.get('[data-testid="input-identifier"]').type(identifier);
    cy.get('[data-testid="input-password"]').type(TEST_PASSWORD);
  },
);

// ─── And — clicar no botão (reutilizavel em multiplos cenarios) ──────────────

When("clica no botão de login", () => {
  cy.get('[data-testid="submit-button"]').click();
});

// ─── Then — sessao autenticada (compartilhado GH-1 e GH-2) ───────────────────

Then("o sistema cria uma sessão autenticada", () => {
  // next-auth v5 com JWT strategy armazena sessao no cookie authjs.session-token
  // (sem prefixo __Secure- porque ambiente local usa HTTP, nao HTTPS)

  // Aguarda o redirecionamento — a URL deve mudar para /users/<id>
  cy.url({ timeout: 15000 }).should("match", /\/users\/.+/);

  // Verifica que o cookie de sessao existe
  cy.getCookie("authjs.session-token", { timeout: 10000 }).should("exist");
});

// ─── And — redirecionamento para area pessoal (compartilhado GH-1 e GH-2) ────

Then("o usuário é redirecionado para sua área pessoal", () => {
  // A URL final deve conter /users/<id> — o id é o userId usado no seed
  cy.url({ timeout: 10000 }).should("include", `/users/${currentUserId}`);
});

// ─── Limpeza apos cada cenario ────────────────────────────────────────────────
// O afterEach do Cucumber nao esta disponivel diretamente — usamos um hook
// customizado via Cypress. Como alternativa, a limpeza pode ser executada
// pelo beforeEach de cenarios subsequentes ou por uma task de cleanup global.
//
// Note: o prefixo TEST_PREFIX nos ids permite limpeza em lote se necessario.

// Step Definitions — GH-4: Redefinir senha com senhas nao coincidentes
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const PASSWORD = "Test@1234";
const CONFIRM_PASSWORD = "Different@5678";
const ID = `gh4-${Date.now()}`;
const TOKEN = `${ID}-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

after(() => {
  cy.task("cleanupPasswordResetTestUser", { userId: ID });
});

before(() => {
  cy.task("seedActiveUserAndPasswordResetToken", {
    userId: ID, username: ID, email: `${ID}@example.com`, tokenValue: TOKEN,
  });
});

Given("que o usuario acessou a tela de redefinicao com um link valido", () => {
  cy.task("findPasswordResetTokenByUserId", { userId: ID }).then((h) => {
    expect(h).to.not.be.null;
  });
  cy.request({
    method: "GET", url: `/api/auth/password-reset/validate?token=${TOKEN}`,
    failOnStatusCode: false,
  }).then((r) => {
    expect(r.status).to.eq(200);
    expect(r.body).to.deep.equal({ valid: true });
  });
});

When("o usuario informa uma nova senha em um campo", () => {
  cy.wrap(PASSWORD).as("newPassword");
});

When("o usuario informa uma confirmacao diferente no outro campo", () => {
  cy.wrap(CONFIRM_PASSWORD).as("confirmPassword");
  expect(PASSWORD).to.not.eq(CONFIRM_PASSWORD);
});

When("o usuario submete o formulario", () => {
  cy.request({
    method: "POST", url: "/api/auth/password-reset/confirm",
    body: { token: TOKEN, password: PASSWORD, passwordConfirm: CONFIRM_PASSWORD },
    headers: { "Content-Type": "application/json" },
    failOnStatusCode: false,
  }).as("confirmRes");
});

Then("o sistema detecta a inconsistencia", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.status).to.eq(400);
  });
});

Then('o sistema exibe mensagem de erro "As senhas nao coincidem"', () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.body.code).to.eq("PASSWORDS_MISMATCH");
    expect(r.body.message).to.eq("As senhas nao coincidem");
  });
});

Then("o formulario permanece visivel para nova tentativa", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.status).to.eq(400);
    expect(r.body.code).to.eq("PASSWORDS_MISMATCH");
  });
  // Verifica que o token nao foi marcado como usado (caso de uso nao foi invocado)
  cy.task("findPasswordResetTokenByUserId", { userId: ID }).then((h: any) => {
    expect(h).to.not.be.null;
  });
  cy.task("findTokenUsedAtByUserId", { userId: ID }).then((usedAt: any) => {
    expect(usedAt).to.be.null;
  });
});

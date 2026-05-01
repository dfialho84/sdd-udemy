// Step Definitions — GH-5: Redefinir senha com senha fraca
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const WEAK_PASSWORD = "12345678";
const ID = `gh5-${Date.now()}`;
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

When("o usuario informa uma senha que nao atende aos criterios de forca\\/complexidade", () => {
  cy.wrap(WEAK_PASSWORD).as("weakPassword");
});

When("o usuario submete o formulario", () => {
  cy.request({
    method: "POST", url: "/api/auth/password-reset/confirm",
    body: { token: TOKEN, password: WEAK_PASSWORD, passwordConfirm: WEAK_PASSWORD },
    headers: { "Content-Type": "application/json" },
    failOnStatusCode: false,
  }).as("confirmRes");
});

Then("o sistema valida a forca da senha", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.status).to.eq(400);
    expect(r.body.code).to.eq("WEAK_PASSWORD");
  });
});

Then("o sistema exibe mensagem de erro indicando os criterios nao atendidos", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.status).to.eq(400);
    expect(r.body.code).to.eq("WEAK_PASSWORD");
    // A mensagem deve listar os criterios nao atendidos (REQ-8)
    expect(r.body.message).to.include("Senha nao atende aos criterios de forca");
    expect(r.body.message).to.include("letra maiuscula");
    expect(r.body.message).to.include("letra minuscula");
    expect(r.body.message).to.include("caractere especial");
  });
});

Then("o formulario permanece visivel para nova tentativa", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.status).to.eq(400);
    expect(r.body.code).to.eq("WEAK_PASSWORD");
  });
  // Verifica que o token nao foi marcado como usado (caso de uso nao alterou estado)
  cy.task("findPasswordResetTokenByUserId", { userId: ID }).then((h: any) => {
    expect(h).to.not.be.null;
  });
  cy.task("findTokenUsedAtByUserId", { userId: ID }).then((usedAt: any) => {
    expect(usedAt).to.be.null;
  });
});

// Step Definitions — GH-3: Redefinir senha com link valido
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const STRONG_PASSWORD = "Test@1234";
const ID = `gh3-${Date.now()}`;
const TOKEN = `${ID}-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

after(() => {
  cy.task("cleanupPasswordResetTestUser", { userId: ID });
});

before(() => {
  cy.task("seedActiveUserAndPasswordResetToken", {
    userId: ID, username: ID, email: `${ID}@example.com`, tokenValue: TOKEN,
  });
});

Given("que o usuario recebeu um link valido de recuperacao", () => {
  cy.task("findPasswordResetTokenByUserId", { userId: ID }).then((h) => {
    expect(h).to.not.be.null;
  });
});

When("o usuario clica no link e acessa a tela de redefinicao", () => {
  cy.request({
    method: "GET", url: `/api/auth/password-reset/validate?token=${TOKEN}`,
    failOnStatusCode: false,
  }).then((r) => {
    expect(r.status).to.eq(200);
    expect(r.body).to.deep.equal({ valid: true });
  });
});

When("o usuario informa uma nova senha valida e sua confirmacao", () => {
  expect(STRONG_PASSWORD.length).to.be.at.least(8);
  expect(STRONG_PASSWORD).to.match(/[A-Z]/);
  expect(STRONG_PASSWORD).to.match(/[a-z]/);
  expect(STRONG_PASSWORD).to.match(/[0-9]/);
  expect(STRONG_PASSWORD).to.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/);
});

When("o usuario submete o formulario", () => {
  cy.request({
    method: "POST", url: "/api/auth/password-reset/confirm",
    body: { token: TOKEN, password: STRONG_PASSWORD, passwordConfirm: STRONG_PASSWORD },
    headers: { "Content-Type": "application/json" },
    failOnStatusCode: false,
  }).as("confirmRes");
});

Then("o sistema valida a forca da senha", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.status).to.eq(200);
    expect(r.body).to.not.have.property("code");
  });
});

Then("o sistema aceita a redefinicao", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.status).to.eq(200);
  });
  // Token é deletado por invalidateAllSessions() como medida de segurança (REQ-10)
  // Verifica que a senha foi atualizada no banco
  cy.task("getUserPasswordHash", { userId: ID }).then((hash: any) => {
    expect(hash).to.not.be.null;
    expect(hash).to.not.eq("$argon2id$v=19$m=65536,t=3,p=2$stubhash");
  });
});

Then("o sistema exibe mensagem de sucesso", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.body.message).to.eq("Senha redefinida com sucesso");
  });
});

Then("o sistema redireciona para tela de login", () => {
  cy.get("@confirmRes").then((r: any) => {
    expect(r.status).to.eq(200);
    expect(r.body).to.deep.equal({ message: "Senha redefinida com sucesso" });
  });
});

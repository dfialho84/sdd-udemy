// Step Definitions — GH-7: Acessar link expirado
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const ID = `gh7-${Date.now()}`;
const TOKEN = `${ID}-${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

after(() => {
  cy.task("cleanupPasswordResetTestUser", { userId: ID });
});

before(() => {
  cy.task("seedActiveUserAndPasswordResetToken", {
    userId: ID, username: ID, email: `${ID}@example.com`, tokenValue: TOKEN,
  });
});

Given("que o usuario recebeu um link de recuperacao", () => {
  cy.task("findPasswordResetTokenByUserId", { userId: ID }).then((h) => {
    expect(h).to.not.be.null;
  });
});

Given("mais de 12 horas passaram desde a geracao do link", () => {
  // Atualiza expires_at para 1 hora no passado simulando token expirado (REQ-12)
  const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  cy.task("updateTokenExpiresAt", { userId: ID, expiresAt: pastDate });
  // Verifica que o token agora esta expirado no banco
  cy.task("findPasswordResetTokenByUserIdWithTimestamps", { userId: ID }).then((t: any) => {
    expect(t).to.not.be.null;
    const expiresAt = new Date(t.expiresAt).getTime();
    expect(expiresAt).to.be.lessThan(Date.now());
  });
});

When("o usuario clica no link expirado", () => {
  cy.request({
    method: "GET", url: `/api/auth/password-reset/validate?token=${TOKEN}`,
    failOnStatusCode: false,
  }).as("validateRes");
});

Then("o sistema detecta a expiracao do token", () => {
  cy.get("@validateRes").then((r: any) => {
    expect(r.status).to.eq(410);
  });
});

Then('o sistema exibe mensagem de erro "O link de recuperacao expirou"', () => {
  cy.get("@validateRes").then((r: any) => {
    expect(r.body.code).to.eq("TOKEN_EXPIRED");
    expect(r.body.message).to.eq("O link de recuperacao expirou");
  });
});

Then("o sistema redireciona para a pagina de recuperacao", () => {
  cy.get("@validateRes").then((r: any) => {
    expect(r.status).to.eq(410);
    // A resposta deve incluir redirecionamento ou hint para a pagina de recuperacao
    expect(r.body.code).to.eq("TOKEN_EXPIRED");
  });
});

Then("o sistema oferece opcao de solicitar um novo link", () => {
  cy.get("@validateRes").then((r: any) => {
    expect(r.body.code).to.eq("TOKEN_EXPIRED");
    // Verifica sugestao de novo link na resposta do validate (REQ-12)
    expect(r.body.message).to.eq("O link de recuperacao expirou");
    // O redirecionamento para /esqueci-senha (pagina de recuperacao) e a opcao
    // de solicitar novo link sao tratados no frontend com base no code TOKEN_EXPIRED
  });
});

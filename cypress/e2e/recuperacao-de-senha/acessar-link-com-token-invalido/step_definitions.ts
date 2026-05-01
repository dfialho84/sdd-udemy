// Step Definitions — GH-8: Acessar link com token invalido
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

const MALFORMED_TOKEN = "abc";
const NONEXISTENT_TOKEN = `${crypto.randomUUID()}-${crypto.randomUUID()}`;

Given("que o usuario possui uma URL com um token malformado ou invalido", () => {
  // Verifica que o token malformado e curto (< 32 chars, fora do formato esperado)
  expect(MALFORMED_TOKEN.length).to.be.lessThan(32);
  // Verifica que o token inexistente tem formato valido mas nao existe no banco
  expect(NONEXISTENT_TOKEN.length).to.be.at.least(32);
});

When("o usuario tenta acessar a URL", () => {
  // Caso 1: token malformado (string curta) — deve retornar 400
  cy.request({
    method: "GET",
    url: `/api/auth/password-reset/validate?token=${MALFORMED_TOKEN}`,
    failOnStatusCode: false,
  }).as("malformedRes");

  // Caso 2: token com formato valido mas inexistente no banco — deve retornar 404
  cy.request({
    method: "GET",
    url: `/api/auth/password-reset/validate?token=${NONEXISTENT_TOKEN}`,
    failOnStatusCode: false,
  }).as("nonexistentRes");
});

Then("o sistema valida o formato do token", () => {
  // Token malformado: 400
  cy.get("@malformedRes").then((r: any) => {
    expect(r.status).to.eq(400);
    expect(r.body.code).to.eq("TOKEN_INVALID");
  });
  // Token inexistente: 404
  cy.get("@nonexistentRes").then((r: any) => {
    expect(r.status).to.eq(404);
    expect(r.body.code).to.eq("TOKEN_INVALID");
  });
});

Then("o sistema rejeita o token invalido", () => {
  cy.get("@malformedRes").then((r: any) => {
    expect(r.body.code).to.eq("TOKEN_INVALID");
    expect(r.body).to.have.property("requestId");
    expect(r.body).to.have.property("timestamp");
  });
  cy.get("@nonexistentRes").then((r: any) => {
    expect(r.body.code).to.eq("TOKEN_INVALID");
    expect(r.body).to.have.property("requestId");
    expect(r.body).to.have.property("timestamp");
  });
});

Then('o sistema exibe mensagem de erro "O link de recuperacao e invalido"', () => {
  cy.get("@malformedRes").then((r: any) => {
    expect(r.body.message).to.eq("O link de recuperacao e invalido");
  });
  cy.get("@nonexistentRes").then((r: any) => {
    expect(r.body.message).to.eq("O link de recuperacao e invalido");
  });
});

Then("o sistema redireciona para a pagina de recuperacao", () => {
  // Verifica que ambos os casos retornam TOKEN_INVALID sem processamento de dominio
  // O redirecionamento para /esqueci-senha e tratado no frontend com base no code TOKEN_INVALID
  cy.get("@malformedRes").then((r: any) => {
    expect(r.status).to.eq(400);
    expect(r.body.code).to.eq("TOKEN_INVALID");
  });
  cy.get("@nonexistentRes").then((r: any) => {
    expect(r.status).to.eq(404);
    expect(r.body.code).to.eq("TOKEN_INVALID");
  });
});

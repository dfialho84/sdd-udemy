// Step Definitions — GH-1: Acessar formulario de cadastro via link na home
// Rastreabilidade: T-68 · REQ-1 · REQ-2 · NFR-1 · NFR-9
// Scenario: "Acessar formulario de cadastro via link na home"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

Given("que o visitante esta na pagina inicial", () => {
  cy.visit("/");
  // Verifica que a pagina inicial carregou com o titulo principal
  cy.get("h1").should("be.visible");
});

When("o visitante clica no link de registro", () => {
  // Localiza o link de registro pelo data-testid e clica
  cy.get('[data-testid="link-register"]').should("be.visible").click();
});

Then("o visitante e levado para a pagina de cadastro", () => {
  // Verifica que a URL mudou para /register (NFR-1: latencia <= 1 segundo)
  cy.url().should("include", "/register");
});

Then(
  "o sistema exibe um formulario com os campos nome, email, senha, confirmacao de senha, data de nascimento e foto de perfil",
  () => {
    // Verifica presenca dos seis campos exigidos por REQ-2
    cy.get('[data-testid="register-form"]').should("be.visible");
    cy.get('[data-testid="input-name"]').should("be.visible");
    cy.get('[data-testid="input-email"]').should("be.visible");
    cy.get('[data-testid="input-password"]').should("be.visible");
    cy.get('[data-testid="input-password-confirmation"]').should("be.visible");
    cy.get('[data-testid="input-birth-date"]').should("be.visible");
    cy.get('[data-testid="input-avatar"]').should("be.visible");
  },
);

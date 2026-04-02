// Step Definitions — GH-2: Cadastro com dados invalidos no formulario
// Rastreabilidade: T-19 · REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7

import { Given, When, Then, Before } from "@badeball/cypress-cucumber-preprocessor";

// Email pre-cadastrado para testar o caso de email duplicado
const existingEmail = `gh2-existing-${Date.now()}@example.com`;

// Dados validos de base — usados como ponto de partida para cada caso invalido
const baseValidData = {
  name: "Visitante Teste GH2",
  email: `gh2-valid-${Date.now()}@example.com`,
  password: "Senha@1234",
  passwordConfirmation: "Senha@1234",
  birthDate: "1990-06-15",
};

// Pré-cadastra um usuario com o email existente antes dos testes que precisam dele
// Usa IP único via X-Forwarded-For para evitar bloqueio pelo rate limiter
Before({ tags: "@email-duplicado" }, () => {
  const setupIp = `10.2.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  cy.request({
    method: "POST",
    url: "/api/auth/register",
    headers: {
      "X-Forwarded-For": setupIp,
    },
    body: {
      name: "Usuario Existente",
      email: existingEmail,
      password: "Senha@1234",
      passwordConfirmation: "Senha@1234",
      birthDate: "1985-01-01",
    },
    failOnStatusCode: false,
  });
});

// Mapa de situacoes invalidas para os dados de formulario correspondentes
function getFormDataForSituacao(situacao: string): {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  birthDate: string;
} {
  switch (situacao) {
    case "email ja associado a uma conta existente":
      return { ...baseValidData, email: existingEmail };
    case "senha sem caractere especial":
      return { ...baseValidData, password: "Senha1234", passwordConfirmation: "Senha1234" };
    case "confirmacao de senha diferente da senha informada":
      return { ...baseValidData, passwordConfirmation: "SenhaDiferente@1234" };
    case "nome em branco":
      return { ...baseValidData, name: "" };
    case "data de nascimento em branco":
      return { ...baseValidData, birthDate: "" };
    case "email com formato invalido":
      return { ...baseValidData, email: "email-invalido" };
    default:
      throw new Error(`Situacao desconhecida: ${situacao}`);
  }
}

// Armazena dados da situacao atual entre steps
let currentFormData: ReturnType<typeof getFormDataForSituacao>;
let currentSituacao: string;

Given("o visitante esta na pagina de cadastro", () => {
  // Intercepta o POST de registro e injeta IP único por exemplo para evitar rate limiting
  const uniqueIp = `10.2.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  cy.intercept("POST", "/api/auth/register", (req) => {
    req.headers["x-forwarded-for"] = uniqueIp;
  });
  cy.visit("/register");
  cy.get('[data-testid="register-form"]').should("be.visible");
});

When("o visitante preenche o formulario com {string}", (situacao: string) => {
  currentSituacao = situacao;
  currentFormData = getFormDataForSituacao(situacao);

  if (currentFormData.name) {
    cy.get('[data-testid="input-name"]').type(currentFormData.name);
  }

  if (currentFormData.email) {
    cy.get('[data-testid="input-email"]').type(currentFormData.email);
  }

  if (currentFormData.password) {
    cy.get('[data-testid="input-password"]').type(currentFormData.password);
  }

  if (currentFormData.passwordConfirmation) {
    cy.get('[data-testid="input-password-confirmation"]').type(
      currentFormData.passwordConfirmation,
    );
  }

  if (currentFormData.birthDate) {
    cy.get('[data-testid="input-birth-date"]').type(currentFormData.birthDate);
  }
});

When("o visitante submete o formulario", () => {
  cy.get('[data-testid="submit-button"]').click();
});

Then("o sistema exibe a mensagem {string}", (mensagem: string) => {
  cy.get('[data-testid="error-message"]', { timeout: 10000 }).should("be.visible");
  cy.get('[data-testid="error-message"]').should("contain.text", mensagem);
});

Then("nenhum cadastro e criado", () => {
  // Verifica que a pagina de sucesso NAO foi exibida — o formulario permanece visivel
  // (ou a mensagem de erro esta visivel, garantindo que nao houve redirecionamento/sucesso)
  cy.get('[data-testid="success-message"]').should("not.exist");

  // Para o caso de email duplicado, verifica via API que nao houve criacao adicional
  // Para outros casos, a ausencia de success-message e suficiente
  if (currentSituacao === "email ja associado a uma conta existente") {
    const verifyIp = `10.2.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    cy.request({
      method: "POST",
      url: "/api/auth/register",
      headers: {
        "X-Forwarded-For": verifyIp,
      },
      body: {
        name: "Tentativa Duplicada",
        email: existingEmail,
        password: "Senha@1234",
        passwordConfirmation: "Senha@1234",
        birthDate: "1990-01-01",
      },
      failOnStatusCode: false,
    }).then((response) => {
      // Confirma que o email ainda retorna 409 (apenas um cadastro existe)
      expect(response.status).to.eq(409);
    });
  }
});

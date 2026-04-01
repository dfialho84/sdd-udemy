// Step Definitions — GH-3: Confirmacao de conta via link valido
// Rastreabilidade: T-42 · REQ-10 · REQ-11 · Scenario: "Confirmacao de conta via link valido"

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// Email e IP unicos por execucao para evitar colisao com outros testes
// e contornar o rate limiter (3 tentativas por IP em 15 minutos)
const testEmail = `gh3-${Date.now()}@example.com`;
const testIp = `10.3.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

// Token extraido do Mailhog apos o registro
let confirmationToken: string;

// Resposta do endpoint de confirmacao
let confirmResponse: Cypress.Response<{
  message: string;
  loginUrl: string;
  registerUrl: string;
}>;

/**
 * GH-3 — Given: visitante possui cadastro "pendente" e recebeu o link por email
 *
 * Estrategia:
 * 1. Registrar usuario via POST /api/auth/register (cria usuario pending + token + envia email)
 * 2. Consultar a API do Mailhog para extrair o token do link de confirmacao
 */
Given(
  'que o visitante possui um cadastro com status "pendente" e recebeu o link de confirmacao por email',
  () => {
    // Inicializar contexto do Cypress visitando a pagina base antes das requisicoes
    cy.visit("/");

    // Registrar usuario via API — cria usuario pending e envia email com token
    // Usa IP unico via X-Forwarded-For para evitar bloqueio pelo rate limiter.
    cy.request({
      method: "POST",
      url: "/api/auth/register",
      headers: {
        "X-Forwarded-For": testIp,
      },
      body: {
        name: "Visitante GH3",
        email: testEmail,
        password: "Senha@1234",
        passwordConfirmation: "Senha@1234",
        birthDate: "1990-06-15",
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status, `POST /api/auth/register retornou ${response.status} (esperado 200)`).to.eq(200);
    });

    // Aguardar o email ser entregue ao Mailhog e extrair o token do link
    cy.request({
      method: "GET",
      url: "http://localhost:8025/api/v2/messages",
      timeout: 10000,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status, `Mailhog retornou status ${response.status}`).to.eq(200);

      const messages = response.body.items as Array<{
        Content: { Headers: { To: string[] } };
        Raw: { Data: string };
      }>;

      // Localizar email destinado ao endereco de teste
      const confirmationEmail = messages.find((msg) =>
        msg.Content.Headers.To.some((to) => to.includes(testEmail)),
      );

      expect(
        confirmationEmail,
        `Email de confirmacao para ${testEmail} nao encontrado no Mailhog`,
      ).to.not.be.undefined;

      // Extrair o token do link de confirmacao presente no corpo do email
      // O conteudo e codificado em quoted-printable (QP).
      // Exemplo de como aparece no email:
      //   /api/auth/confirm?=\r\ntoken=3Dbc9007...
      // Apos decodificacao QP completa:
      //   /api/auth/confirm?token=bc9007...
      const rawData = confirmationEmail!.Raw.Data;

      // Decodificar quoted-printable:
      // 1. Remover soft line breaks (=\r\n ou =\n)
      // 2. Decodificar bytes codificados (=XX -> caractere)
      const decoded = rawData
        .replace(/=\r\n/g, "")
        .replace(/=\n/g, "")
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex: string) =>
          String.fromCharCode(parseInt(hex, 16)),
        );

      // Extrair o token da URL de confirmacao
      const tokenMatch = decoded.match(/\/api\/auth\/confirm\?token=([a-f0-9]{32})/i);

      expect(
        tokenMatch,
        "Token de confirmacao nao encontrado no email do Mailhog",
      ).to.not.be.null;

      confirmationToken = tokenMatch![1];
    });
  },
);

/**
 * GH-3 — When: visitante clica no link de confirmacao dentro do prazo de 24 horas
 *
 * Acessa GET /api/auth/confirm?token=<valor> diretamente via cy.request
 */
When("o visitante clica no link de confirmacao dentro do prazo de 24 horas", () => {
  cy.request({
    method: "GET",
    url: `/api/auth/confirm?token=${confirmationToken}`,
    failOnStatusCode: false,
  }).then((response) => {
    confirmResponse = response as typeof confirmResponse;
  });
});

/**
 * GH-3 — Then: sistema exibe mensagem de sucesso informando que a conta foi ativada
 *
 * Verifica HTTP 200 e presenca da mensagem de ativacao na resposta
 */
Then("o sistema exibe uma mensagem de sucesso informando que a conta foi ativada", () => {
  expect(confirmResponse.status).to.eq(200);
  expect(confirmResponse.body.message).to.include("ativada com sucesso");
});

/**
 * GH-3 — And: link para acessar o sistema e apresentado ao visitante
 *
 * Verifica presenca do loginUrl na resposta (REQ-11)
 */
Then("um link para acessar o sistema e apresentado ao visitante", () => {
  expect(confirmResponse.body.loginUrl).to.be.a("string");
  expect(confirmResponse.body.loginUrl).to.include("/login");
});

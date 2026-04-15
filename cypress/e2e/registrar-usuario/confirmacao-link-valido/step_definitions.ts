// Step Definitions — GH-3: Confirmacao de conta via link valido
// Rastreabilidade: T-42 · REQ-10 · REQ-11 · Scenario: "Confirmacao de conta via link valido"
//
// Correcao: o endpoint GET /api/auth/confirm retorna HTTP 302 Redirect para /confirm?status=success
// (nao JSON com HTTP 200). Os steps agora usam cy.visit para seguir o redirect e verificam
// o conteudo HTML da pagina /confirm renderizada pelo Next.js.

import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";

// Email, username e IP unicos por execucao para evitar colisao com outros testes
// e contornar o rate limiter (3 tentativas por IP em 15 minutos)
const testEmail = `gh3-${Date.now()}@example.com`;
const testUsername = `gh3user${Date.now()}`;
const testIp = `10.3.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

// Token extraido do Mailhog apos o registro
let confirmationToken: string;

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

    // Registrar usuario via multipart/form-data — cria usuario pending e envia email com token.
    // O endpoint exige multipart/form-data (DT-6). Usa cy.window().fetch para enviar FormData.
    // Usa IP unico via X-Forwarded-For para evitar bloqueio pelo rate limiter.
    cy.window().then((win) => {
      const formData = new win.FormData();
      formData.append("name", "Visitante GH3");
      formData.append("username", testUsername);
      formData.append("email", testEmail);
      formData.append("password", "Senha@1234");
      formData.append("passwordConfirmation", "Senha@1234");
      formData.append("birthDate", "1990-06-15");

      return win
        .fetch("/api/auth/register", {
          method: "POST",
          headers: { "X-Forwarded-For": testIp },
          body: formData,
        })
        .then((res: Response) => {
          expect(res.status, `POST /api/auth/register retornou ${res.status} (esperado 200)`).to.eq(200);
        });
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
 * Usa cy.visit para seguir o HTTP 302 Redirect para /confirm?status=success,
 * simulando o comportamento real do usuario que clica no link no email.
 */
When("o visitante clica no link de confirmacao dentro do prazo de 24 horas", () => {
  // cy.visit segue automaticamente o redirect 302 do endpoint para /confirm?status=success
  cy.visit(`/api/auth/confirm?token=${confirmationToken}`);
});

/**
 * GH-3 — Then: sistema exibe mensagem de sucesso informando que a conta foi ativada
 *
 * Verifica conteudo HTML da pagina /confirm?status=success renderizada pelo Next.js (REQ-11).
 * A pagina exibe: "Sua conta foi ativada com sucesso." e um link "Fazer login" para /login.
 */
Then("o sistema exibe uma mensagem de sucesso informando que a conta foi ativada", () => {
  // Verifica que o redirect levou para /confirm com status=success
  cy.url().should("include", "/confirm");
  cy.url().should("include", "status=success");

  // Verifica conteudo da pagina — mensagem de ativacao bem-sucedida
  cy.contains("Sua conta foi ativada com sucesso.").should("be.visible");
});

/**
 * GH-3 — And: link para acessar o sistema e apresentado ao visitante
 *
 * Verifica presenca do link "Fazer login" apontando para /login (REQ-11).
 */
Then("um link para acessar o sistema e apresentado ao visitante", () => {
  cy.get('a[href="/login"]').should("be.visible");
  cy.get('a[href="/login"]').should("contain.text", "Fazer login");
});

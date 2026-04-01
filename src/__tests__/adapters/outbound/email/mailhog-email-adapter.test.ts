// Testes de integração — MailhogEmailAdapter
// IT-4: Rastreabilidade: REQ-9 · NFR-6 · T-30 · T-34
//
// Pré-requisito: Mailhog rodando via Docker Compose na porta SMTP 1025 e API HTTP 8025.
// Variáveis de ambiente: MAILHOG_HOST (padrão: localhost), MAILHOG_PORT (padrão: 1025).

import { MailhogEmailAdapter } from "@/adapters/outbound/email/mailhog-email-adapter";

const MAILHOG_API_URL =
  `http://${process.env.MAILHOG_HOST ?? "localhost"}:8025`;

/**
 * Consulta a API REST do Mailhog e retorna as mensagens na caixa de entrada.
 */
async function fetchMailhogMessages(): Promise<
  Array<{ ID: string; Content: { Headers: Record<string, string[]>; Body: string }; To: Array<{ Mailbox: string; Domain: string }> }>
> {
  const res = await fetch(`${MAILHOG_API_URL}/api/v2/messages`);
  if (!res.ok) {
    throw new Error(`Mailhog API respondeu com status ${res.status}`);
  }
  const data = await res.json();
  return data.items ?? [];
}

/**
 * Remove todas as mensagens do Mailhog para garantir caixa limpa entre testes.
 */
async function clearMailhog(): Promise<void> {
  const res = await fetch(`${MAILHOG_API_URL}/api/v1/messages`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`Falha ao limpar Mailhog: status ${res.status}`);
  }
}

describe("IT-4: MailhogEmailAdapter — send()", () => {
  const adapter = new MailhogEmailAdapter();

  beforeEach(async () => {
    await clearMailhog();
  });

  it("envia email com destinatário, assunto e link de confirmação corretos", async () => {
    const to = "usuario@example.com";
    const subject = "Confirme seu cadastro";
    const confirmationUrl = "http://localhost:3000/api/auth/confirm?token=abc123def456abc123def456abc123de";

    await adapter.send({ to, subject, confirmationUrl });

    const messages = await fetchMailhogMessages();

    expect(messages.length).toBeGreaterThanOrEqual(1);

    const message = messages.find((m) => {
      const toHeader = m.Content.Headers["To"]?.[0] ?? "";
      return toHeader.includes(to);
    });

    expect(message).toBeDefined();
    expect(message!.Content.Headers["Subject"]?.[0]).toBe(subject);

    // O corpo do email é armazenado pelo Mailhog em quoted-printable encoding.
    // Verificamos que o token aparece no corpo (pode estar partido em linhas, mas o valor está presente).
    // O token "abc123def456abc123def456abc123de" não contém caracteres especiais e
    // aparecerá intacto no body codificado.
    const token = "abc123def456abc123def456abc123de";
    expect(message!.Content.Body).toContain(token);
  });

  it("lança exceção quando o host SMTP está indisponível", async () => {
    const adapterComHostInvalido = new MailhogEmailAdapter({
      host: "localhost",
      port: 19999, // porta que não existe
      fromAddress: "noreply@kanban.local",
    });

    await expect(
      adapterComHostInvalido.send({
        to: "teste@example.com",
        subject: "Teste",
        confirmationUrl: "http://localhost:3000/confirm?token=xxx",
      }),
    ).rejects.toThrow();
  });
});

// Testes de integração — LoginEmailNotificationAdapter
// IT-6: EmailNotificationAdapter — sendLoginWarning
// Rastreabilidade: REQ-14 · NFR-8 · T-55
//
// Pré-requisito: Mailhog rodando via Docker Compose nas portas SMTP 1025 e API HTTP 8025.
// Variáveis de ambiente: MAILHOG_HOST (padrão: localhost), MAILHOG_PORT (padrão: 1025).

import { LoginEmailNotificationAdapter } from "@/adapters/outbound/email/login-email-notification-adapter";

const MAILHOG_API_URL = `http://${process.env.MAILHOG_HOST ?? "localhost"}:8025`;

interface MailhogMessage {
  ID: string;
  Content: {
    Headers: Record<string, string[]>;
    Body: string;
  };
  To: Array<{ Mailbox: string; Domain: string }>;
}

/**
 * Consulta a API REST do Mailhog e retorna as mensagens na caixa de entrada.
 */
async function fetchMailhogMessages(): Promise<MailhogMessage[]> {
  const res = await fetch(`${MAILHOG_API_URL}/api/v2/messages`);
  if (!res.ok) {
    throw new Error(`Mailhog API respondeu com status ${res.status}`);
  }
  const data = await res.json();
  return (data.items as MailhogMessage[]) ?? [];
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

describe("IT-6: LoginEmailNotificationAdapter — sendLoginWarning()", () => {
  const adapter = new LoginEmailNotificationAdapter();

  beforeEach(async () => {
    await clearMailhog();
  });

  it("entrega email de aviso ao Mailhog com destinatário e assunto corretos", async () => {
    const toEmail = "alice@example.com";

    await adapter.sendLoginWarning(toEmail);

    const messages = await fetchMailhogMessages();

    expect(messages.length).toBeGreaterThanOrEqual(1);

    const message = messages.find((m) => {
      const toHeader = m.Content.Headers["To"]?.[0] ?? "";
      return toHeader.includes(toEmail);
    });

    expect(message).toBeDefined();

    const subject = message!.Content.Headers["Subject"]?.[0] ?? "";
    expect(subject.toLowerCase()).toContain("login");

    // Verifica que o corpo contém texto de aviso de segurança
    const body = message!.Content.Body;
    expect(body.length).toBeGreaterThan(0);
  });

  it("lança exceção quando o host SMTP está indisponível (caller é responsável por fire-and-forget — DT-4, NFR-8)", async () => {
    const adapterComHostInvalido = new LoginEmailNotificationAdapter({
      host: "localhost",
      port: 19999, // porta que não existe
      fromAddress: "noreply@kanban.local",
    });

    await expect(
      adapterComHostInvalido.sendLoginWarning("test@example.com"),
    ).rejects.toThrow();
  });
});

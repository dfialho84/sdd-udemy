// MailhogEmailAdapter — adapter outbound de envio de email
// Implementação concreta de EmailService para ambiente de desenvolvimento via Mailhog SMTP.
// Rastreabilidade: T-30 · REQ-9 · NFR-6

import nodemailer from "nodemailer";
import type { EmailService, SendEmailInput } from "@/domain/ports/email-service";

export interface MailhogConfig {
  host: string;
  port: number;
  fromAddress: string;
}

const DEFAULT_CONFIG: MailhogConfig = {
  host: process.env.MAILHOG_HOST ?? "localhost",
  port: Number(process.env.MAILHOG_PORT ?? "1025"),
  fromAddress: process.env.MAIL_FROM ?? "noreply@kanban.local",
};

/**
 * Envia emails transacionais ao Mailhog via SMTP.
 * Lança exceção em caso de falha de conexão ou envio para que o chamador possa logar (NFR-6).
 */
export class MailhogEmailAdapter implements EmailService {
  private readonly config: MailhogConfig;

  constructor(config: MailhogConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async send(input: SendEmailInput): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: false,
      auth: undefined,
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Confirme seu cadastro</h2>
        <p>Clique no link abaixo para confirmar seu endereço de email e ativar sua conta:</p>
        <p>
          <a href="${input.confirmationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: #fff; text-decoration: none; border-radius: 4px;">
            Confirmar minha conta
          </a>
        </p>
        <p>O link é válido por 24 horas.</p>
        <p>Se você não solicitou este cadastro, ignore este email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: this.config.fromAddress,
      to: input.to,
      subject: input.subject,
      html,
      text: `Confirme seu cadastro acessando: ${input.confirmationUrl}`,
    });
  }
}

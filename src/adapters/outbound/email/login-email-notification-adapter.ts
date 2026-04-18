// LoginEmailNotificationAdapter — adapter outbound de notificacao de seguranca de login
// Implementa EmailNotificationPort usando Nodemailer + Mailhog em desenvolvimento.
// Fire-and-forget — falhas nao propagadas para o chamador (DT-4, NFR-8).
// Rastreabilidade: T-50 · REQ-14 · NFR-8

import nodemailer from "nodemailer";
import type { EmailNotificationPort } from "@/domain/ports/email-notification.port";

interface MailhogConfig {
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
 * Envia email de aviso de tentativa de login com senha incorreta.
 * Usa Mailhog em desenvolvimento via SMTP (porta 1025 por padrao).
 * Lanca excecao em caso de falha — o chamador (use case) e responsavel por capturar e logar (NFR-8).
 */
export class LoginEmailNotificationAdapter implements EmailNotificationPort {
  private readonly config: MailhogConfig;

  constructor(config: MailhogConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  async sendLoginWarning(toEmail: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: false,
      auth: undefined,
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Tentativa de acesso com senha incorreta</h2>
        <p>Detectamos uma tentativa de login na sua conta com uma senha incorreta.</p>
        <p>Se foi voce, ignore este email. Se nao reconhece esta atividade, recomendamos:</p>
        <ul>
          <li>Alterar sua senha imediatamente</li>
          <li>Verificar se ha outras atividades suspeitas na sua conta</li>
        </ul>
        <p style="color: #666; font-size: 12px;">
          Esta e uma mensagem automatica de seguranca. Nao responda a este email.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: this.config.fromAddress,
      to: toEmail,
      subject: "Aviso de seguranca: tentativa de login com senha incorreta",
      html,
      text: "Detectamos uma tentativa de login na sua conta com senha incorreta. Se nao foi voce, altere sua senha imediatamente.",
    });
  }
}

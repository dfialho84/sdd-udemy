// PasswordResetEmailAdapter — adapter outbound de envio de email de recuperacao de senha
// Implementacao concreta de IEmailService usando nodemailer via SMTP.
// Token nunca deve aparecer em logs (NFR-3).
// Rastreabilidade: T-09 · REQ-5 · NFR-1 · NFR-3

import nodemailer from "nodemailer";
import type { IEmailService } from "@/domain/ports/password-reset-email-service";

export interface PasswordResetEmailConfig {
  host: string;
  port: number;
  fromAddress: string;
  appUrl: string;
}

const DEFAULT_CONFIG: PasswordResetEmailConfig = {
  host: process.env.MAILHOG_HOST ?? "localhost",
  port: Number(process.env.MAILHOG_PORT ?? "1025"),
  fromAddress: process.env.MAIL_FROM ?? "noreply@kanban.local",
  appUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
};

export class PasswordResetEmailAdapter implements IEmailService {
  private readonly config: PasswordResetEmailConfig;

  constructor(config: PasswordResetEmailConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Envia email contendo link de recuperacao de senha com token em texto plano.
   * O token e passado via query string na URL (HTTPS em producao — NFR-3).
   * Falhas de envio sao lancadas como excecao para que o chamador possa loga-las
   * via AuditLogger sem propagar ao usuario (DT-3).
   * Rastreabilidade: REQ-5 · NFR-3
   */
  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.config.appUrl}/auth/password-reset?token=${encodeURIComponent(token)}`;

    const transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: false,
      auth: undefined,
    });

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Recuperacao de senha</h2>
        <p>Recebemos uma solicitacao de recuperacao de senha para sua conta.</p>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: #fff; text-decoration: none; border-radius: 4px;">
            Redefinir minha senha
          </a>
        </p>
        <p>O link e valido por 12 horas.</p>
        <p>Se voce nao solicitou esta recuperacao, ignore este email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: this.config.fromAddress,
      to: email,
      subject: "Recuperacao de senha",
      html,
      text: `Redefina sua senha acessando: ${resetUrl}`,
    });
  }
}

// Port outbound — EmailNotificationPort
// Interface do Domain para envio de notificacoes de email de seguranca.
// Abstrai o mecanismo de envio concreto (Nodemailer/Mailhog), mantendo o Domain
// desacoplado da infraestrutura de email (constitution.md regras 13, 16, 18).
// Rastreabilidade: T-49 · REQ-14 · NFR-8

export interface EmailNotificationPort {
  /**
   * Envia email de aviso de tentativa de login com senha incorreta.
   * Chamado apenas quando o usuario existe e a senha nao confere (REQ-14).
   * O envio e fire-and-forget — falhas nao devem bloquear a resposta HTTP (NFR-8, DT-4).
   *
   * @param toEmail - endereco de email do destinatario (usuario cadastrado)
   */
  sendLoginWarning(toEmail: string): Promise<void>;
}

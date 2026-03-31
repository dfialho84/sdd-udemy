// Port outbound — EmailService
// Rastreabilidade: REQ-9 · NFR-6 · T-06

export interface SendEmailInput {
  to: string;
  subject: string;
  /** URL completa do link de confirmação de conta */
  confirmationUrl: string;
}

export interface EmailService {
  /**
   * Envia um email transacional com o link de confirmação de conta.
   * Falhas devem ser lançadas como exceção para que o chamador possa logar (NFR-6).
   */
  send(input: SendEmailInput): Promise<void>;
}

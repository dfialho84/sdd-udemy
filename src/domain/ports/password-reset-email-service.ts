// Port outbound — IEmailService (envio de email de recuperacao de senha)
// Rastreabilidade: T-08 · REQ-5

export interface IEmailService {
  /**
   * Envia email com link de recuperacao de senha contendo o token em texto plano.
   * O token e passado para montagem do link pelo adapter (ex: https://<host>/auth/password-reset?token=<token>).
   * Falhas devem ser capturadas e registradas via AuditLogger sem propagar ao usuario.
   * Rastreabilidade: REQ-5
   */
  sendPasswordReset(email: string, token: string): Promise<void>;
}

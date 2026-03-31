// Port outbound — PasswordHasher
// Rastreabilidade: REQ-4 · NFR-2 · T-06

export interface PasswordHasher {
  /**
   * Gera o hash da senha fornecida.
   * A implementação concreta deve usar argon2id (NFR-2).
   */
  hash(password: string): Promise<string>;
}

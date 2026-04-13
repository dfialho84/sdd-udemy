// Port outbound — PasswordVerifier
// Interface do Domain para verificacao de senha contra hash armazenado.
// Abstrai o algoritmo concreto (argon2id) do Domain, mantendo o Domain
// desacoplado da biblioteca argon2 (constitution.md regras 13 e 16).
// Rastreabilidade: T-05 · REQ-2

export interface PasswordVerifier {
  /**
   * Verifica se a senha em texto simples confere com o hash armazenado.
   * A implementacao concreta usa argon2id (64 MB, 3 iteracoes, paralelismo 2).
   * @param password - senha em texto simples fornecida pelo usuario
   * @param hash - hash argon2id armazenado no banco de dados
   * @returns true se a senha confere, false caso contrario
   */
  verify(password: string, hash: string): Promise<boolean>;
}

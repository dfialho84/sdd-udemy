// Argon2PasswordVerifier — adapter outbound de verificacao de senhas
// Implementacao concreta de PasswordVerifier usando argon2id.
// Importa argon2 apenas neste adapter — nunca no Domain (constitution.md regras 13, 16).
// Rastreabilidade: T-06 · REQ-2 · NFR-6

import argon2 from "argon2";
import type { PasswordVerifier } from "@/domain/ports/password-verifier";

export class Argon2PasswordVerifier implements PasswordVerifier {
  /**
   * Verifica se a senha em texto simples confere com o hash argon2id armazenado.
   * Compativel com hashes gerados pela feature registrar-usuario (DT-3):
   * - memoria: 64 MB (memoryCost: 65536)
   * - iteracoes: 3 (timeCost: 3)
   * - paralelismo: 2
   *
   * @param password - senha em texto simples fornecida pelo usuario
   * @param hash - hash argon2id armazenado no banco de dados
   * @returns true se a senha confere; false se nao confere ou hash invalido
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // Hash malformado ou parametros incompativeis — nao e erro de negocio,
      // apenas indica que a verificacao falhou. Retorna false sem propagar excecao.
      return false;
    }
  }
}

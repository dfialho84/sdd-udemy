// Argon2PasswordHasher — adapter outbound de hashing de senhas
// Implementação concreta de PasswordHasher usando argon2id.
// Rastreabilidade: T-13 · REQ-4 · NFR-2

import argon2 from "argon2";
import type { PasswordHasher } from "@/domain/ports/password-hasher";

/**
 * Parâmetros argon2id conforme NFR-2 e DT-1:
 * - memória: 64 MB
 * - iterações: 3
 * - paralelismo: 2
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024, // 64 MB em KiB
  timeCost: 3,           // 3 iterações
  parallelism: 2,
};

export class Argon2PasswordHasher implements PasswordHasher {
  /**
   * Gera hash argon2id da senha fornecida.
   * O hash gerado começa com "$argon2id$" e é diferente do texto original.
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  /**
   * Verifica se a senha em texto simples corresponde ao hash fornecido.
   * Usado internamente nos testes; não faz parte da interface PasswordHasher.
   */
  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}

// CryptoTokenGenerator — adapter outbound de geração de tokens
// Implementação concreta de TokenGenerator usando crypto.randomBytes.
// Rastreabilidade: T-28 · REQ-9 · NFR-3 · DT-2

import { randomBytes } from "crypto";
import type { TokenGenerator } from "@/domain/ports/token-generator";

/**
 * Gera tokens com entropia mínima de 128 bits usando crypto.randomBytes(16).
 * O resultado é codificado em hexadecimal, produzindo 32 caracteres (NFR-3).
 */
export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomBytes(16).toString("hex");
  }
}

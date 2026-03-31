// Port outbound — TokenGenerator
// Rastreabilidade: NFR-3 · DT-2 · T-06

export interface TokenGenerator {
  /**
   * Gera um token com entropia mínima de 128 bits.
   * A implementação concreta deve usar crypto.randomBytes(16) em hex (NFR-3).
   */
  generate(): string;
}

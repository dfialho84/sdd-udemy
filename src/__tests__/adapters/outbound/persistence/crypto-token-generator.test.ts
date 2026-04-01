// Testes unitários — CryptoTokenGenerator.generate()
// Rastreabilidade: UT-5 · NFR-3 · T-32

import { CryptoTokenGenerator } from "@/adapters/outbound/persistence/crypto-token-generator";

describe("CryptoTokenGenerator", () => {
  let generator: CryptoTokenGenerator;

  beforeEach(() => {
    generator = new CryptoTokenGenerator();
  });

  describe("generate()", () => {
    it("UT-5a: token gerado tem 32 caracteres hexadecimais (16 bytes = 128 bits)", () => {
      const token = generator.generate();

      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[0-9a-f]{32}$/);
    });

    it("UT-5b: duas chamadas consecutivas retornam valores distintos", () => {
      const token1 = generator.generate();
      const token2 = generator.generate();

      expect(token1).not.toBe(token2);
    });
  });
});

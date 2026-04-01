// Testes unitários e de segurança — CryptoTokenGenerator.generate()
// Rastreabilidade: UT-5 · ST-4 · NFR-3 · T-32 · T-35

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

  describe("ST-4: Entropia mínima dos tokens de confirmação (NFR-3)", () => {
    it("ST-4a: token gerado tem 32 caracteres hexadecimais", () => {
      const token = generator.generate();

      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[0-9a-f]{32}$/);
    });

    it("ST-4b: amostra de 1.000 tokens não contém duplicatas", () => {
      const tokens: string[] = [];
      const sampleSize = 1000;

      for (let i = 0; i < sampleSize; i++) {
        const token = generator.generate();
        tokens.push(token);
      }

      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(sampleSize);
    });

    it("ST-4c: tokens não seguem padrão previsível (sequencial ou baseado em timestamp)", () => {
      const tokens: string[] = [];
      const sampleSize = 100;

      for (let i = 0; i < sampleSize; i++) {
        tokens.push(generator.generate());
      }

      // Verificar que não é sequencial (diferença constante entre tokens)
      let sequentialCount = 0;
      for (let i = 1; i < tokens.length; i++) {
        // Se a diferença for constante por vários elementos consecutivos,
        // indica padrão sequencial
        if (i >= 3) {
          const prevDiff1 = parseInt(tokens[i - 1], 16) - parseInt(tokens[i - 2], 16);
          const prevDiff2 = parseInt(tokens[i], 16) - parseInt(tokens[i - 1], 16);

          if (prevDiff1 === prevDiff2) {
            sequentialCount++;
          }
        }
      }

      // Permitir até 3 coincidências por acaso, mas rejeitar se houver padrão claro
      expect(sequentialCount).toBeLessThan(5);

      // Verificar que os tokens não são baseados em timestamp verificando
      // a distribuição dos primeiros 8 caracteres (que seriam o mais "tempo-like")
      const firstChars: string[] = [];
      for (const token of tokens) {
        firstChars.push(token.slice(0, 8));
      }

      // Todos os primeiros 8 chars devem ser distintos para evitar padrão temporal
      const uniqueFirstChars = new Set(firstChars);
      expect(uniqueFirstChars.size).toBe(firstChars.length);
    });
  });
});

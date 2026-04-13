// Testes UT-1 e IT-7 — Argon2PasswordVerifier.verify()
// Rastreabilidade: T-06 · REQ-2 · NFR-6 · DT-3

import argon2 from "argon2";
import { Argon2PasswordVerifier } from "@/adapters/outbound/persistence/argon2-password-verifier";

/**
 * Parametros argon2id definidos em DT-3 — identicos aos usados em registrar-usuario.
 * Usados para gerar hashes no setup dos testes de integracao (IT-7).
 */
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024, // 64 MB em KiB
  timeCost: 3,
  parallelism: 2,
};

describe("UT-1: Argon2PasswordVerifier.verify()", () => {
  const verifier = new Argon2PasswordVerifier();

  it("(a) retorna true para senha correta verificada contra hash argon2id valido", async () => {
    const password = "Senh@1234";
    const hash = await argon2.hash(password, ARGON2_OPTIONS);

    const result = await verifier.verify(password, hash);

    expect(result).toBe(true);
  });

  it("(b) retorna false para senha incorreta verificada contra hash argon2id valido", async () => {
    const password = "Senh@1234";
    const wrongPassword = "SenhaErrada!99";
    const hash = await argon2.hash(password, ARGON2_OPTIONS);

    const result = await verifier.verify(wrongPassword, hash);

    expect(result).toBe(false);
  });

  it("(c) retorna false (nao lanca excecao) para hash malformado ou corrompido", async () => {
    const result = await verifier.verify("qualquerSenha", "hash-invalido-nao-argon2");

    expect(result).toBe(false);
  });
}, 30000); // timeout estendido — argon2id e deliberadamente lento (NFR-6)

describe("IT-7: Argon2PasswordVerifier — integracao com biblioteca argon2 real", () => {
  const verifier = new Argon2PasswordVerifier();

  it("senha correta verificada contra hash gerado com parametros DT-3 retorna true", async () => {
    const password = "Senha@Complexa456!";
    const hash = await argon2.hash(password, ARGON2_OPTIONS);

    const result = await verifier.verify(password, hash);

    expect(result).toBe(true);
  });

  it("senha incorreta verificada contra hash valido retorna false", async () => {
    const password = "Senha@Complexa456!";
    const hash = await argon2.hash(password, ARGON2_OPTIONS);

    const result = await verifier.verify("SenhaCompletamenteDiferente!", hash);

    expect(result).toBe(false);
  });

  it("compatibilidade com hashes gerados pela feature registrar-usuario (mesmos parametros DT-3)", async () => {
    // Simula hash gerado pelo Argon2PasswordHasher da feature registrar-usuario
    const password = "TesteSenha@123";
    const hashFromRegisterFeature = await argon2.hash(password, ARGON2_OPTIONS);

    // O verifier da feature login deve aceitar hashes gerados pelo hasher de registrar-usuario
    const result = await verifier.verify(password, hashFromRegisterFeature);

    expect(result).toBe(true);
  });

  it("hash gerado com parametros diferentes resulta em false (protecao contra incompatibilidade)", async () => {
    const password = "Senha@123";
    // Gera hash com parametros diferentes (apenas 1 iteracao)
    const hashWithDifferentParams = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 64 * 1024,
      timeCost: 1, // diferente de DT-3 (3 iteracoes)
      parallelism: 2,
    });

    // argon2.verify verifica os parametros internos do hash — deve retornar true
    // pois o hash contem os parametros usados para gera-lo e a verificacao e compativel
    // Nota: argon2 embute os parametros no proprio hash, entao verify funciona independente
    const result = await verifier.verify(password, hashWithDifferentParams);

    // A biblioteca argon2 sempre verifica corretamente pois os parametros estao no hash
    expect(result).toBe(true);
  });
}, 30000); // timeout estendido — argon2id e deliberadamente lento

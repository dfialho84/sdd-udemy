// Testes unitários — Argon2PasswordHasher
// UT-6: Rastreabilidade: NFR-2 · T-13 · T-14

import { Argon2PasswordHasher } from "@/adapters/outbound/persistence/argon2-password-hasher";

describe("UT-6: Argon2PasswordHasher.hash()", () => {
  const hasher = new Argon2PasswordHasher();

  it("hash gerado é diferente da senha em texto simples (NFR-2)", async () => {
    const password = "Senha@123";

    const hash = await hasher.hash(password);

    expect(hash).not.toBe(password);
  });

  it("hash começa com identificador argon2id ($argon2id$)", async () => {
    const hash = await hasher.hash("Senha@123");

    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("hash da mesma senha é verificável (verify retorna true)", async () => {
    const password = "Senha@Complexa456!";

    const hash = await hasher.hash(password);
    const isValid = await hasher.verify(hash, password);

    expect(isValid).toBe(true);
  });

  it("hashes gerados para a mesma senha são diferentes entre si (salt aleatório)", async () => {
    const password = "Senha@123";

    const hash1 = await hasher.hash(password);
    const hash2 = await hasher.hash(password);

    expect(hash1).not.toBe(hash2);
  });
}, 30000); // timeout estendido — argon2id é deliberadamente lento (NFR-2)

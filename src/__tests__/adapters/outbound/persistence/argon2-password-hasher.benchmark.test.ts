// Benchmark de performance — Argon2PasswordHasher.hash()
// PT-2: Rastreabilidade: NFR-1 · NFR-2 · T-15
//
// Threshold: máximo de 1.000 ms por operação (NFR-1: budget dentro do SLA de 3s)
// Execuções: 10 consecutivas; relata média e valor máximo.

import { Argon2PasswordHasher } from "@/adapters/outbound/persistence/argon2-password-hasher";

describe("PT-2: Argon2PasswordHasher.hash() — benchmark de latência", () => {
  const hasher = new Argon2PasswordHasher();
  const EXECUTIONS = 10;
  const MAX_THRESHOLD_MS = 1000;

  it(`executa ${EXECUTIONS} hashes consecutivos com máximo <= ${MAX_THRESHOLD_MS}ms (NFR-1, NFR-2)`, async () => {
    const times: number[] = [];

    for (let i = 0; i < EXECUTIONS; i++) {
      const start = performance.now();
      await hasher.hash(`SenhaTest@${i}Benchmark`);
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    console.log(`[PT-2] Argon2PasswordHasher.hash() — ${EXECUTIONS} execuções:`);
    console.log(`  Média: ${avg.toFixed(1)}ms`);
    console.log(`  Máximo: ${max.toFixed(1)}ms`);
    console.log(`  Threshold: ${MAX_THRESHOLD_MS}ms`);

    expect(max).toBeLessThanOrEqual(MAX_THRESHOLD_MS);
  }, 60000); // timeout de 60s para 10 execuções de argon2id
});

// Teste de integração IT-4 — DrizzleLoginAttemptRepository.countRecentFailures
// Testa a contagem de falhas na janela deslizante de 10 minutos por identifier.
// Rastreabilidade: T-38 · IT-4 · REQ-8 · NFR-3
//
// Pré-requisito: banco MySQL de teste rodando com migration aplicada.
// DATABASE_URL deve apontar para o banco de teste.

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts } from "@/lib/db/schema";
import { DrizzleLoginAttemptRepository } from "@/adapters/outbound/persistence/drizzle-login-attempt-repository";

const IDENTIFIER = "it4-test@example.com";

// Fecha a conexão com o banco após todos os describes
afterAll(async () => {
  await (db.$client as { end?: () => Promise<void> }).end?.();
});

describe("IT-4: DrizzleLoginAttemptRepository — countRecentFailures", () => {
  const repo = new DrizzleLoginAttemptRepository();

  // Limpa registros de teste antes e depois de cada caso
  beforeEach(async () => {
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, IDENTIFIER));
  });

  afterEach(async () => {
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, IDENTIFIER));
  });

  /** Insere uma tentativa de login diretamente na tabela com timestamp customizado */
  async function insertAttempt(identifier: string, success: boolean, createdAt: Date): Promise<void> {
    await db.insert(loginAttempts).values({
      id: randomUUID(),
      identifier,
      success,
      createdAt,
    });
  }

  describe("3 registros failure nos ultimos 10 minutos", () => {
    it("retorna 3", async () => {
      // Arrange: insere 3 tentativas falhas recentes (dentro de 5 minutos)
      const now = new Date();
      await insertAttempt(IDENTIFIER, false, new Date(now.getTime() - 1 * 60 * 1000));
      await insertAttempt(IDENTIFIER, false, new Date(now.getTime() - 3 * 60 * 1000));
      await insertAttempt(IDENTIFIER, false, new Date(now.getTime() - 5 * 60 * 1000));

      // Act
      const count = await repo.countRecentFailures(IDENTIFIER, 10);

      // Assert
      expect(count).toBe(3);
    });
  });

  describe("mistura de registros recentes e antigos", () => {
    it("retorna apenas as falhas dentro da janela de 10 minutos (3, nao 4)", async () => {
      // Arrange: 3 falhas recentes + 1 falha antiga (fora da janela) + 1 sucesso recente
      const now = new Date();
      await insertAttempt(IDENTIFIER, false, new Date(now.getTime() - 2 * 60 * 1000));   // recente (2 min)
      await insertAttempt(IDENTIFIER, false, new Date(now.getTime() - 4 * 60 * 1000));   // recente (4 min)
      await insertAttempt(IDENTIFIER, false, new Date(now.getTime() - 7 * 60 * 1000));   // recente (7 min)
      await insertAttempt(IDENTIFIER, false, new Date(now.getTime() - 15 * 60 * 1000));  // antiga (15 min) — fora da janela
      await insertAttempt(IDENTIFIER, true, new Date(now.getTime() - 3 * 60 * 1000));    // sucesso recente — nao conta

      // Act
      const count = await repo.countRecentFailures(IDENTIFIER, 10);

      // Assert: apenas as 3 falhas dentro de 10 min, nao 4
      expect(count).toBe(3);
    });
  });

  describe("nenhum registro", () => {
    it("retorna 0", async () => {
      // Arrange: banco limpo para o identifier (garantido pelo beforeEach)

      // Act
      const count = await repo.countRecentFailures(IDENTIFIER, 10);

      // Assert
      expect(count).toBe(0);
    });
  });
});

// Testes de integração — DrizzleLoginAttemptRepository
// Rastreabilidade: T-48 · IT-3 · T-38 · IT-4 · T-39 · IT-5
//                 REQ-8 · REQ-9 · REQ-11 · REQ-12 · REQ-13 · NFR-3 · NFR-4 · NFR-7
//
// Pré-requisito: banco MySQL de teste rodando com migration aplicada.
// DATABASE_URL deve apontar para o banco de teste.

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts, loginBlocks } from "@/lib/db/schema";
import { DrizzleLoginAttemptRepository } from "@/adapters/outbound/persistence/drizzle-login-attempt-repository";

const ID_IT3 = "it3-test@example.com";
const ID_IT4 = "it4-test@example.com";
const ID_IT5 = "it5-test@example.com";

// Fecha a conexão com o banco após todos os describes
afterAll(async () => {
  await (db.$client as { end?: () => void }).end?.();
});

// ───── IT-3: save ─────

describe("IT-3: DrizzleLoginAttemptRepository — save", () => {
  const repo = new DrizzleLoginAttemptRepository();

  // Limpa registros de teste antes e depois de cada caso
  beforeEach(async () => {
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, ID_IT3));
  });

  afterEach(async () => {
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, ID_IT3));
  });

  describe("save com success: true", () => {
    it("insere registro na tabela login_attempts com identifier, success=true e created_at corretos", async () => {
      // Arrange
      const now = new Date();
      const attempt = { identifier: ID_IT3, success: true, created_at: now };

      // Act
      await repo.save(attempt);

      // Assert: busca o registro inserido diretamente na tabela
      const rows = await db
        .select()
        .from(loginAttempts)
        .where(eq(loginAttempts.identifier, ID_IT3));

      expect(rows).toHaveLength(1);
      expect(rows[0]!.identifier).toBe(ID_IT3);
      expect(rows[0]!.success).toBe(true);
      // MySQL timestamp pode truncar milissegundos; tolerancia de 2 segundos
      expect(Math.abs(rows[0]!.createdAt.getTime() - now.getTime())).toBeLessThanOrEqual(2000);
    });
  });

  describe("save com success: false", () => {
    it("insere registro na tabela login_attempts com success=false", async () => {
      // Arrange
      const now = new Date();
      const attempt = { identifier: ID_IT3, success: false, created_at: now };

      // Act
      await repo.save(attempt);

      // Assert
      const rows = await db
        .select()
        .from(loginAttempts)
        .where(eq(loginAttempts.identifier, ID_IT3));

      expect(rows).toHaveLength(1);
      expect(rows[0]!.identifier).toBe(ID_IT3);
      expect(rows[0]!.success).toBe(false);
      expect(Math.abs(rows[0]!.createdAt.getTime() - now.getTime())).toBeLessThanOrEqual(2000);
    });
  });

  describe("save multiplas tentativas", () => {
    it("insere ambas tentativas — bem-sucedida e fracassada — na tabela", async () => {
      // Arrange
      const now = new Date();
      const successAttempt = { identifier: ID_IT3, success: true, created_at: new Date(now.getTime() - 1000) };
      const failureAttempt = { identifier: ID_IT3, success: false, created_at: now };

      // Act
      await repo.save(successAttempt);
      await repo.save(failureAttempt);

      // Assert: ambos os registros existem
      const rows = await db
        .select()
        .from(loginAttempts)
        .where(eq(loginAttempts.identifier, ID_IT3));

      expect(rows).toHaveLength(2);

      const successRow = rows.find((r) => r.success === true);
      const failureRow = rows.find((r) => r.success === false);

      expect(successRow).toBeDefined();
      expect(failureRow).toBeDefined();
      expect(successRow!.identifier).toBe(ID_IT3);
      expect(failureRow!.identifier).toBe(ID_IT3);
    });
  });
});

// ───── IT-4: countRecentFailures ─────

describe("IT-4: DrizzleLoginAttemptRepository — countRecentFailures", () => {
  const repo = new DrizzleLoginAttemptRepository();

  // Limpa registros de teste antes e depois de cada caso
  beforeEach(async () => {
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, ID_IT4));
  });

  afterEach(async () => {
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, ID_IT4));
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
      await insertAttempt(ID_IT4, false, new Date(now.getTime() - 1 * 60 * 1000));
      await insertAttempt(ID_IT4, false, new Date(now.getTime() - 3 * 60 * 1000));
      await insertAttempt(ID_IT4, false, new Date(now.getTime() - 5 * 60 * 1000));

      // Act
      const count = await repo.countRecentFailures(ID_IT4, 10);

      // Assert
      expect(count).toBe(3);
    });
  });

  describe("mistura de registros recentes e antigos", () => {
    it("retorna apenas as falhas dentro da janela de 10 minutos (3, nao 4)", async () => {
      // Arrange: 3 falhas recentes + 1 falha antiga (fora da janela) + 1 sucesso recente
      const now = new Date();
      await insertAttempt(ID_IT4, false, new Date(now.getTime() - 2 * 60 * 1000));   // recente (2 min)
      await insertAttempt(ID_IT4, false, new Date(now.getTime() - 4 * 60 * 1000));   // recente (4 min)
      await insertAttempt(ID_IT4, false, new Date(now.getTime() - 7 * 60 * 1000));   // recente (7 min)
      await insertAttempt(ID_IT4, false, new Date(now.getTime() - 15 * 60 * 1000));  // antiga (15 min) — fora da janela
      await insertAttempt(ID_IT4, true, new Date(now.getTime() - 3 * 60 * 1000));    // sucesso recente — nao conta

      // Act
      const count = await repo.countRecentFailures(ID_IT4, 10);

      // Assert: apenas as 3 falhas dentro de 10 min, nao 4
      expect(count).toBe(3);
    });
  });

  describe("nenhum registro", () => {
    it("retorna 0", async () => {
      // Arrange: banco limpo para o identifier (garantido pelo beforeEach)

      // Act
      const count = await repo.countRecentFailures(ID_IT4, 10);

      // Assert
      expect(count).toBe(0);
    });
  });
});

// ───── IT-5: ciclo completo de bloqueio ─────

describe("IT-5: DrizzleLoginAttemptRepository — ciclo completo de bloqueio", () => {
  const repo = new DrizzleLoginAttemptRepository();

  // Limpa registros de teste antes e depois de cada caso
  beforeEach(async () => {
    await db.delete(loginBlocks).where(eq(loginBlocks.identifier, ID_IT5));
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, ID_IT5));
  });

  afterEach(async () => {
    await db.delete(loginBlocks).where(eq(loginBlocks.identifier, ID_IT5));
    await db.delete(loginAttempts).where(eq(loginAttempts.identifier, ID_IT5));
  });

  /** Helper: insere um registro de bloqueio diretamente na tabela com blockedUntil customizado */
  async function insertBlock(identifier: string, blockedUntil: Date): Promise<void> {
    await db.insert(loginBlocks).values({
      id: randomUUID(),
      identifier,
      blockedUntil,
    });
  }

  /** Helper: insere tentativas failure diretamente na tabela */
  async function insertFailure(identifier: string, createdAt: Date): Promise<void> {
    await db.insert(loginAttempts).values({
      id: randomUUID(),
      identifier,
      success: false,
      createdAt,
    });
  }

  // ─── Caso 1: createBlock (REQ-9 · NFR-4) ───

  describe("createBlock", () => {
    it("cria registro de bloqueio com blocked_until = now + 15 minutos e findActiveBlock retorna o bloqueio", async () => {
      // Arrange
      const now = new Date();
      const blockedUntil = new Date(now.getTime() + 15 * 60 * 1000);

      // Act
      await repo.createBlock(ID_IT5, blockedUntil);
      const block = await repo.findActiveBlock(ID_IT5);

      // Assert
      expect(block).not.toBeNull();
      expect(block!.identifier).toBe(ID_IT5);
      // MySQL timestamp pode truncar milissegundos; tolerancia de 2 segundos
      expect(Math.abs(block!.blocked_until.getTime() - blockedUntil.getTime())).toBeLessThanOrEqual(2000);
      // Bloqueio deve estar ativo (blocked_until > now)
      expect(block!.blocked_until.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  // ─── Caso 2: findActiveBlock com blocked_until > now (REQ-9 · REQ-11) ───

  describe("findActiveBlock com blocked_until > now", () => {
    it("retorna o bloqueio ativo", async () => {
      // Arrange: cria bloqueio com expiracao no futuro
      const now = new Date();
      const futureTime = new Date(now.getTime() + 15 * 60 * 1000);
      await repo.createBlock(ID_IT5, futureTime);

      // Act
      const block = await repo.findActiveBlock(ID_IT5);

      // Assert: bloqueio existe e esta vigente
      expect(block).not.toBeNull();
      expect(block!.identifier).toBe(ID_IT5);
      expect(block!.blocked_until.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  // ─── Caso 3: findActiveBlock com blocked_until < now (REQ-11 · NFR-4) ───

  describe("findActiveBlock com blocked_until < now", () => {
    it("retorna null — bloqueio expirado nao e considerado ativo", async () => {
      // Arrange: insere diretamente um bloqueio ja expirado (blocked_until no passado)
      const pastTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutos atras
      await insertBlock(ID_IT5, pastTime);

      // Act
      const block = await repo.findActiveBlock(ID_IT5);

      // Assert: bloqueio expirado nao deve ser retornado como ativo
      expect(block).toBeNull();
    });
  });

  // ─── Caso 4: removeBlock (REQ-12) ───

  describe("removeBlock", () => {
    it("remove o registro de bloqueio do banco", async () => {
      // Arrange: cria um bloqueio ativo
      const now = new Date();
      const futureTime = new Date(now.getTime() + 15 * 60 * 1000);
      await repo.createBlock(ID_IT5, futureTime);

      // Confirma que o bloqueio existe
      const activeBefore = await repo.findActiveBlock(ID_IT5);
      expect(activeBefore).not.toBeNull();

      // Act
      await repo.removeBlock(ID_IT5);

      // Assert: bloqueio removido — findActiveBlock retorna null
      const activeAfter = await repo.findActiveBlock(ID_IT5);
      expect(activeAfter).toBeNull();
    });
  });

  // ─── Caso 5: resetFailureCount (REQ-12) ───

  describe("resetFailureCount", () => {
    it("remove os registros de failure do identifier na tabela login_attempts e countRecentFailures retorna 0", async () => {
      // Arrange: insere 3 falhas recentes para o identifier
      const now = new Date();
      await insertFailure(ID_IT5, new Date(now.getTime() - 1 * 60 * 1000));
      await insertFailure(ID_IT5, new Date(now.getTime() - 3 * 60 * 1000));
      await insertFailure(ID_IT5, new Date(now.getTime() - 7 * 60 * 1000));

      // Confirma que as falhas estao contabilizadas
      const countBefore = await repo.countRecentFailures(ID_IT5, 10);
      expect(countBefore).toBe(3);

      // Act
      await repo.resetFailureCount(ID_IT5);

      // Assert: contador zerado
      const countAfter = await repo.countRecentFailures(ID_IT5, 10);
      expect(countAfter).toBe(0);
    });
  });
});

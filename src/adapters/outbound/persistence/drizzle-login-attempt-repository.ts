// DrizzleLoginAttemptRepository — adapter outbound de persistencia para tentativas de login
// Implementa LoginAttemptRepository usando Drizzle ORM sobre MySQL.
// Sem importacoes de Next.js ou React (constitution.md regras 13, 16, 18).
// Rastreabilidade: T-27 · T-28 · T-29 · T-30 · T-42 · T-43
// REQ-8 · REQ-9 · REQ-11 · REQ-12 · REQ-13 · NFR-1 · NFR-3 · NFR-4 · NFR-7

import { randomUUID } from "crypto";
import { eq, and, lt, gte, count, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { loginAttempts, loginBlocks } from "@/lib/db/schema";
import type { LoginAttemptRepository } from "@/domain/ports/login-attempt-repository";
import type { LoginBlock } from "@/domain/entities/login-attempt";

export class DrizzleLoginAttemptRepository implements LoginAttemptRepository {
  /**
   * Persiste uma tentativa de autenticacao (bem-sucedida ou fracassada).
   * Obrigatorio para toda tentativa, independente do resultado (REQ-13, NFR-7).
   * Rastreabilidade: T-27
   */
  async save(attempt: { identifier: string; success: boolean; created_at: Date }): Promise<void> {
    await db.insert(loginAttempts).values({
      id: randomUUID(),
      identifier: attempt.identifier,
      success: attempt.success,
      createdAt: attempt.created_at,
    });
  }

  /**
   * Conta tentativas fracassadas dentro de uma janela deslizante em minutos.
   * Usado para decidir se deve ativar bloqueio (REQ-8, NFR-3).
   * Rastreabilidade: T-28
   */
  async countRecentFailures(identifier: string, windowMinutes: number): Promise<number> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    const result = await db
      .select({ total: count() })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifier, identifier),
          eq(loginAttempts.success, false),
          gte(loginAttempts.createdAt, windowStart),
        ),
      );

    return result[0]?.total ?? 0;
  }

  /**
   * Retorna o bloqueio ativo para o identificador, ou null se nao houver.
   * Um bloqueio e considerado ativo quando blocked_until > now.
   * Rastreabilidade: T-29
   */
  async findActiveBlock(identifier: string): Promise<LoginBlock | null> {
    const now = new Date();

    const rows = await db
      .select()
      .from(loginBlocks)
      .where(
        and(
          eq(loginBlocks.identifier, identifier),
          gte(loginBlocks.blockedUntil, now),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0]!;
    return {
      id: row.id,
      identifier: row.identifier,
      blocked_until: row.blockedUntil,
      created_at: row.createdAt,
    };
  }

  /**
   * Retorna o bloqueio mais recente para o identificador,
   * independentemente de estar ativo ou expirado (REQ-12).
   * Usado para deteccao de bloqueios expirados que precisam ser removidos.
   * Rastreabilidade: T-44 · T-46
   */
  async findAnyBlock(identifier: string): Promise<LoginBlock | null> {
    const rows = await db
      .select()
      .from(loginBlocks)
      .where(eq(loginBlocks.identifier, identifier))
      .orderBy(loginBlocks.blockedUntil, "desc")
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0]!;
    return {
      id: row.id,
      identifier: row.identifier,
      blocked_until: row.blockedUntil,
      created_at: row.createdAt,
    };
  }

  /**
   * Cria um novo bloqueio para o identificador com a data de expiracao informada.
   * Chamado quando failureCount >= 3 em 10 minutos (REQ-9).
   * Rastreabilidade: T-30
   */
  async createBlock(identifier: string, blockedUntil: Date): Promise<void> {
    await db.insert(loginBlocks).values({
      id: randomUUID(),
      identifier,
      blockedUntil,
    });
  }

  /**
   * Remove o registro de bloqueio do identificador (REQ-12).
   * Chamado quando o bloqueio expirou e o usuario tenta autenticar novamente.
   * Rastreabilidade: T-42
   */
  async removeBlock(identifier: string): Promise<void> {
    await db
      .delete(loginBlocks)
      .where(eq(loginBlocks.identifier, identifier));
  }

  /**
   * Remove registros de tentativas fracassadas do identificador,
   * zerando o contador efetivo da janela deslizante (REQ-12).
   * Rastreabilidade: T-43
   */
  async resetFailureCount(identifier: string): Promise<void> {
    await db
      .delete(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifier, identifier),
          eq(loginAttempts.success, false),
        ),
      );
  }

  /**
   * Remove bloqueios expirados — blocked_until < now.
   * Metodo auxiliar para limpeza periodica (nao faz parte da interface Port).
   */
  async removeExpiredBlocks(): Promise<void> {
    const now = new Date();
    await db
      .delete(loginBlocks)
      .where(lt(loginBlocks.blockedUntil, now));
  }
}

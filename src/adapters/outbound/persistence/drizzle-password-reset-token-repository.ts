// PasswordResetTokenRepositoryDrizzle — adapter outbound de persistencia
// Implementacao concreta de IPasswordResetTokenRepository usando Drizzle ORM sobre MySQL.
// Rastreabilidade: T-06 · REQ-4 · REQ-6 · NFR-3

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";
import { PasswordResetToken } from "@/domain/entities/password-reset-token";
import type {
  IPasswordResetTokenRepository,
  CreatePasswordResetTokenParams,
} from "@/domain/ports/password-reset-token-repository";

export class PasswordResetTokenRepositoryDrizzle implements IPasswordResetTokenRepository {
  /**
   * Persiste um novo token de recuperacao de senha.
   * Rastreabilidade: REQ-4
   */
  async create(data: CreatePasswordResetTokenParams): Promise<void> {
    await db.insert(passwordResetTokens).values({
      id: randomUUID(),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      usedAt: null,
    });
  }

  /**
   * Busca um token pelo hash SHA-256.
   * Retorna entidade PasswordResetToken ou null se nao encontrado.
   * Rastreabilidade: REQ-4 · REQ-6
   */
  async findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (rows.length === 0) return null;
    return this.toEntity(rows[0]!);
  }

  /**
   * Marca o token como utilizado, preenchendo used_at com o timestamp atual.
   * Rastreabilidade: REQ-6 · NFR-4
   */
  async markAsUsed(tokenHash: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
  }

  /** Converte o registro do banco na entidade de dominio. */
  private toEntity(
    record: typeof passwordResetTokens.$inferSelect,
  ): PasswordResetToken {
    return new PasswordResetToken({
      tokenHash: record.tokenHash,
      expiresAt:
        record.expiresAt instanceof Date
          ? record.expiresAt
          : new Date(record.expiresAt),
      usedAt: record.usedAt
        ? (record.usedAt instanceof Date ? record.usedAt : new Date(record.usedAt))
        : null,
      userId: record.userId,
    });
  }
}

// DrizzleConfirmationTokenRepository — adapter outbound de persistência
// Implementação concreta de ConfirmationTokenRepository usando Drizzle ORM sobre MySQL.
// Rastreabilidade: T-31 · T-38 · REQ-9 · REQ-14 · REQ-15 · NFR-3

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { confirmationTokens } from "@/lib/db/schema";
import { ConfirmationToken } from "@/domain/entities/confirmation-token";
import type {
  ConfirmationTokenRepository,
  CreateConfirmationTokenInput,
} from "@/domain/ports/confirmation-token-repository";

export class DrizzleConfirmationTokenRepository implements ConfirmationTokenRepository {
  /**
   * Persiste um novo token de confirmação.
   * expires_at = criação + 24h é responsabilidade do chamador (RegisterUserUseCase).
   */
  async create(input: CreateConfirmationTokenInput): Promise<ConfirmationToken> {
    await db.insert(confirmationTokens).values({
      id: input.id,
      userId: input.userId,
      token: input.token,
      expiresAt: input.expiresAt,
      usedAt: input.usedAt ?? null,
    });

    const row = await db
      .select()
      .from(confirmationTokens)
      .where(eq(confirmationTokens.id, input.id))
      .limit(1);

    const record = row[0];
    if (!record) {
      throw new Error(
        `DrizzleConfirmationTokenRepository.create: registro não encontrado após inserção (id=${input.id})`,
      );
    }

    return this.toEntity(record);
  }

  /**
   * Busca um token pelo seu valor.
   * Retorna null se não encontrado.
   */
  async findByToken(token: string): Promise<ConfirmationToken | null> {
    const rows = await db
      .select()
      .from(confirmationTokens)
      .where(eq(confirmationTokens.token, token))
      .limit(1);

    if (rows.length === 0) return null;
    return this.toEntity(rows[0]!);
  }

  /**
   * Marca o token como utilizado preenchendo used_at com o instante atual.
   * Invalida imediatamente o token após o primeiro uso bem-sucedido (NFR-3 · REQ-14).
   */
  async markAsUsed(tokenId: string): Promise<void> {
    await db
      .update(confirmationTokens)
      .set({ usedAt: new Date() })
      .where(eq(confirmationTokens.id, tokenId));
  }

  /** Converte o registro do banco na entidade de domínio. */
  private toEntity(record: typeof confirmationTokens.$inferSelect): ConfirmationToken {
    return new ConfirmationToken({
      id: record.id,
      userId: record.userId,
      token: record.token,
      expiresAt: record.expiresAt instanceof Date ? record.expiresAt : new Date(record.expiresAt),
      usedAt: record.usedAt ? (record.usedAt instanceof Date ? record.usedAt : new Date(record.usedAt)) : null,
      createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt),
    });
  }
}

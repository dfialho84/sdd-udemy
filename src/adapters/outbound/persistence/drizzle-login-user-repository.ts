// DrizzleLoginUserRepository — adapter outbound de persistência para login
// Implementação concreta de LoginUserRepository usando Drizzle ORM sobre MySQL.
// Segue ISP (constitution.md regra 8): interface mínima com apenas findByIdentifier.
// Sem importações de Next.js ou React (constitution.md regras 13, 16).
// Rastreabilidade: T-09 · REQ-2

import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { LoginUser } from "@/domain/entities/login-user";
import type { LoginUserRepository } from "@/domain/ports/login-user-repository";

export class DrizzleLoginUserRepository implements LoginUserRepository {
  /**
   * Busca um usuário ativo pelo username ou email.
   * Retorna null se não encontrado ou se o status não for 'active'.
   *
   * @param identifier - username ou email do usuário
   * @returns LoginUser com status active, ou null se não encontrado/inativo
   */
  async findByIdentifier(identifier: string): Promise<LoginUser | null> {
    const rows = await db
      .select()
      .from(users)
      .where(or(eq(users.username, identifier), eq(users.email, identifier)))
      .limit(1);

    if (rows.length === 0) return null;

    const record = rows[0]!;
    if (record.status !== "active") return null;

    return {
      id: record.id,
      username: record.username,
      email: record.email,
      passwordHash: record.passwordHash,
      status: record.status,
    };
  }
}

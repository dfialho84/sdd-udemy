// DrizzleUserRepository — adapter outbound de persistência
// Implementação concreta de UserRepository usando Drizzle ORM sobre MySQL.
// Rastreabilidade: T-08 · REQ-3 · REQ-8

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { User } from "@/domain/entities/user";
import type { UserRepository, CreateUserInput } from "@/domain/ports/user-repository";

export class DrizzleUserRepository implements UserRepository {
  /**
   * Persiste um novo usuário no banco.
   * Lança erro se o email já existir (constraint UNIQUE).
   */
  async create(input: CreateUserInput): Promise<User> {
    await db.insert(users).values({
      id: input.id,
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      birthDate: input.birthDate,
      avatarUrl: input.avatarUrl ?? null,
      status: input.status,
    });

    // Recupera o registro recém-criado para obter createdAt e updatedAt gerados pelo banco
    const row = await db.select().from(users).where(eq(users.id, input.id)).limit(1);

    const record = row[0];
    if (!record) {
      throw new Error(`DrizzleUserRepository.create: registro não encontrado após inserção (id=${input.id})`);
    }

    return this.toEntity(record);
  }

  /**
   * Busca um usuário pelo email.
   * Retorna null se não encontrado.
   */
  async findByEmail(email: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length === 0) return null;
    return this.toEntity(rows[0]!);
  }

  /**
   * Busca um usuário pelo id.
   * Retorna null se não encontrado.
   */
  async findById(id: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (rows.length === 0) return null;
    return this.toEntity(rows[0]!);
  }

  /**
   * Remove o usuário com o id fornecido.
   * Utilizado quando o token de confirmação expira (REQ-12).
   */
  async delete(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  /**
   * Atualiza o status do usuário para 'active'.
   * Utilizado após confirmação bem-sucedida do token (REQ-10).
   */
  async activate(id: string): Promise<void> {
    await db.update(users).set({ status: "active" }).where(eq(users.id, id));
  }

  /** Converte o registro do banco na entidade de domínio. */
  private toEntity(record: typeof users.$inferSelect): User {
    return new User({
      id: record.id,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      birthDate: record.birthDate instanceof Date ? record.birthDate : new Date(record.birthDate),
      avatarUrl: record.avatarUrl ?? null,
      status: record.status as "pending" | "active",
      createdAt: record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt : new Date(record.updatedAt),
    });
  }
}

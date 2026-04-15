// Schemas do banco de dados — adicionados por feature.
// Cada tabela deve corresponder a uma entidade em src/domain/entities/.
// Rastreabilidade: T-02 · REQ-1 · REQ-2 · REQ-7 · REQ-8 · T-25 · REQ-9 · NFR-3 · NFR-6 · T-85

import {
  mysqlTable,
  varchar,
  mysqlEnum,
  date,
  timestamp,
} from "drizzle-orm/mysql-core";

// Tabela users — corresponde à entidade User em src/domain/entities/user.ts
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  /** Username unico na plataforma — indice UNIQUE no banco (REQ-7, NFR-6) */
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  birthDate: date("birth_date").notNull(),
  /** Object key do MinIO no formato `avatars/<uuid>.<ext>` */
  avatarKey: varchar("avatar_key", { length: 500 }),
  status: mysqlEnum("status", ["pending", "active"]).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// Tabela confirmation_tokens — corresponde à entidade ConfirmationToken em src/domain/entities/confirmation-token.ts
// Rastreabilidade: T-25 · REQ-9 · NFR-3
export const confirmationTokens = mysqlTable("confirmation_tokens", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

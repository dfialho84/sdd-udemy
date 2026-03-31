// Schemas do banco de dados — adicionados por feature.
// Cada tabela deve corresponder a uma entidade em src/domain/entities/.
// Rastreabilidade: T-02 · REQ-1 · REQ-8

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
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  birthDate: date("birth_date").notNull(),
  avatarUrl: varchar("avatar_url", { length: 2048 }),
  status: mysqlEnum("status", ["pending", "active"]).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

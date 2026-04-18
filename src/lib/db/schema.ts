// Schemas do banco de dados — adicionados por feature.
// Cada tabela deve corresponder a uma entidade em src/domain/entities/.
// Rastreabilidade: T-02 · REQ-1 · REQ-2 · REQ-7 · REQ-8 · T-25 · REQ-9 · NFR-3 · NFR-6 · T-85 · T-26

import {
  mysqlTable,
  varchar,
  mysqlEnum,
  date,
  timestamp,
  boolean,
  index,
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

// Tabela login_attempts — registra toda tentativa de autenticacao (bem-sucedida ou fracassada).
// Sem FK para users — identifier pode nao corresponder a usuario existente (REQ-13).
// Indice em identifier para performance da janela deslizante de 10 min (NFR-1, NFR-3).
// Rastreabilidade: T-26 · REQ-8 · REQ-9 · REQ-13 · NFR-1 · NFR-3
export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    /** Username ou email submetido — pode nao existir na tabela users (REQ-13) */
    identifier: varchar("identifier", { length: 255 }).notNull(),
    /** true se autenticacao bem-sucedida; false se fracassada */
    success: boolean("success").notNull(),
    /** Timestamp da tentativa — base da janela deslizante de 10 min (REQ-8, NFR-7) */
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("login_attempts_identifier_idx").on(table.identifier),
    index("login_attempts_created_at_idx").on(table.createdAt),
  ],
);

// Tabela login_blocks — registra bloqueios de identificadores apos 3 falhas em 10 min (REQ-9).
// Um identificador tem no maximo um bloqueio ativo por vez.
// Indice em identifier para consulta rapida de bloqueio ativo (NFR-4).
// Rastreabilidade: T-26 · REQ-9 · REQ-11 · REQ-12 · NFR-4
export const loginBlocks = mysqlTable(
  "login_blocks",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    /** Identificador bloqueado (username ou email) */
    identifier: varchar("identifier", { length: 255 }).notNull(),
    /** Momento de expiracao do bloqueio — ativacao + 15 min (REQ-9, REQ-12) */
    blockedUntil: timestamp("blocked_until").notNull(),
    /** Timestamp de ativacao do bloqueio */
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("login_blocks_identifier_idx").on(table.identifier),
  ],
);

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

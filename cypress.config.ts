import { defineConfig } from "cypress";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";
import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, varchar, mysqlEnum, date, timestamp, boolean } from "drizzle-orm/mysql-core";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import crypto from "node:crypto";

// Schemas inline para uso nas tasks do Cypress (sem importar do src/ que usa aliases Next.js)
const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  birthDate: date("birth_date").notNull(),
  avatarKey: varchar("avatar_key", { length: 500 }),
  status: mysqlEnum("status", ["pending", "active"]).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

const confirmationTokens = mysqlTable("confirmation_tokens", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const loginAttempts = mysqlTable("login_attempts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  success: boolean("success").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const loginBlocks = mysqlTable("login_blocks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  blockedUntil: timestamp("blocked_until").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Instancia Drizzle reutilizavel para as tasks do Cypress
const DB_URL = process.env.DATABASE_URL ?? "mysql://kanban:kanban@localhost:3306/kanban_db";
const db = drizzle(DB_URL);

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.feature",
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on(
        "file:preprocessor",
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        }),
      );

      // Tasks de banco para setup/teardown de cenários E2E que requerem estado direto no banco
      // GH-4: token expirado | GH-5: token já utilizado
      on("task", {
        // Insere usuario pending + token expirado (-25h) para o cenario GH-4
        async seedExpiredToken({
          userId,
          tokenId,
          email,
          tokenValue,
        }: {
          userId: string;
          tokenId: string;
          email: string;
          tokenValue: string;
        }) {
          const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // -25h

          await db.insert(users).values({
            id: userId,
            name: "Visitante GH4",
            username: email.split("@")[0],
            email,
            passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
            birthDate: new Date("1990-01-01"),
            status: "pending",
          });

          await db.insert(confirmationTokens).values({
            id: tokenId,
            userId,
            token: tokenValue,
            expiresAt: past,
            usedAt: null,
          });

          return null;
        },

        // Verifica se usuario existe no banco pelo id (GH-4)
        async userExistsById({ userId }: { userId: string }) {
          const rows = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, userId));
          return rows.length > 0;
        },

        // Remove todos os registros de teste com o prefixo de email informado (GH-4, GH-5)
        async cleanupTestUsers({ emailPrefix }: { emailPrefix: string }) {
          const allUsers = await db
            .select({ id: users.id, email: users.email })
            .from(users);
          const toDelete = allUsers.filter((u) => u.email.startsWith(emailPrefix));

          for (const user of toDelete) {
            await db
              .delete(confirmationTokens)
              .where(eq(confirmationTokens.userId, user.id));
            await db.delete(users).where(eq(users.id, user.id));
          }

          return null;
        },

        // Insere usuario active + token ja utilizado para o cenario GH-5
        async seedUsedToken({
          userId,
          tokenId,
          email,
          tokenValue,
        }: {
          userId: string;
          tokenId: string;
          email: string;
          tokenValue: string;
        }) {
          const future = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h
          const usedAt = new Date(Date.now() - 60 * 1000); // 1 minuto atras

          await db.insert(users).values({
            id: userId,
            name: "Visitante GH5",
            username: email.split("@")[0],
            email,
            passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
            birthDate: new Date("1990-01-01"),
            status: "active",
          });

          await db.insert(confirmationTokens).values({
            id: tokenId,
            userId,
            token: tokenValue,
            expiresAt: future,
            usedAt,
          });

          return null;
        },

        // Retorna o status atual do usuario pelo id (GH-5)
        async getUserStatus({ userId }: { userId: string }) {
          const rows = await db
            .select({ status: users.status })
            .from(users)
            .where(eq(users.id, userId));
          return rows[0]?.status ?? null;
        },

        // T-16: Insere usuario active com hash argon2id para testes E2E de login (GH-1, GH-2)
        async seedLoginUser({
          userId,
          name,
          username,
          email,
          password,
          status,
          birthDate,
        }: {
          userId: string;
          name: string;
          username: string;
          email: string;
          password: string;
          status: "active" | "pending";
          birthDate: string;
        }) {
          // Gera hash argon2id com os mesmos parametros de producao (64 MB, 3 iteracoes, paralelismo 2)
          const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 64 * 1024, // 64 MB
            timeCost: 3,           // 3 iteracoes
            parallelism: 2,
          });

          // Remove usuario pre-existente com mesmo username/email (evita unique constraint)
          await db.delete(users).where(eq(users.username, username));
          await db.delete(users).where(eq(users.email, email));
          await db.delete(users).where(eq(users.id, userId));
          // Remove tentativas e bloqueios pre-existentes para o mesmo username/email
          await db.delete(loginAttempts).where(eq(loginAttempts.identifier, username));
          await db.delete(loginAttempts).where(eq(loginAttempts.identifier, email));
          await db.delete(loginBlocks).where(eq(loginBlocks.identifier, username));
          await db.delete(loginBlocks).where(eq(loginBlocks.identifier, email));

          // Insere o usuario de teste
          await db.insert(users).values({
            id: userId,
            name,
            username,
            email,
            passwordHash,
            birthDate: new Date(birthDate),
            status,
          });

          return { userId, username, email };
        },

        // T-16: Remove usuarios de teste pelo prefixo do userId
        async cleanupLoginTestUsers({ userIdPrefix }: { userIdPrefix: string }) {
          const allUsers = await db
            .select({ id: users.id, username: users.username, email: users.email })
            .from(users);
          const toDelete = allUsers.filter((u) => u.id.startsWith(userIdPrefix));

          for (const user of toDelete) {
            await db.delete(loginAttempts).where(eq(loginAttempts.identifier, user.username));
            await db.delete(loginAttempts).where(eq(loginAttempts.identifier, user.email));
            await db.delete(loginBlocks).where(eq(loginBlocks.identifier, user.username));
            await db.delete(loginBlocks).where(eq(loginBlocks.identifier, user.email));
            await db.delete(confirmationTokens).where(eq(confirmationTokens.userId, user.id));
            await db.delete(users).where(eq(users.id, user.id));
          }

          return null;
        },

        // T-40: Insere usuario active + 3 tentativas fracassadas recentes para GH-6
        // (Cenario: Bloquear apos 3 tentativas erradas em 10 minutos — REQ-8, REQ-9, NFR-3)
        async seedFailedLoginAttempts({
          userId,
          name,
          username,
          email,
          password,
          status,
          birthDate,
          identifier,
        }: {
          userId: string;
          name: string;
          username: string;
          email: string;
          password: string;
          status: "active" | "pending";
          birthDate: string;
          identifier: string;
        }) {
          const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 64 * 1024,
            timeCost: 3,
            parallelism: 2,
          });

          // Limpa dados pre-existentes
          await db.delete(users).where(eq(users.username, username));
          await db.delete(users).where(eq(users.email, email));
          await db.delete(users).where(eq(users.id, userId));
          await db.delete(loginAttempts).where(eq(loginAttempts.identifier, username));
          await db.delete(loginAttempts).where(eq(loginAttempts.identifier, email));
          await db.delete(loginBlocks).where(eq(loginBlocks.identifier, username));
          await db.delete(loginBlocks).where(eq(loginBlocks.identifier, email));

          // Insere o usuario de teste (active)
          await db.insert(users).values({
            id: userId,
            name,
            username,
            email,
            passwordHash,
            birthDate: new Date(birthDate),
            status,
          });

          // Insere 3 tentativas fracassadas nos ultimos 10 minutos
          // Timestamps: 9 min atras, 7 min atras, 5 min atras
          const now = Date.now();
          const offsetsMinutes = [9, 7, 5];
          for (const offset of offsetsMinutes) {
            await db.insert(loginAttempts).values({
              id: crypto.randomUUID(),
              identifier,
              success: false,
              createdAt: new Date(now - offset * 60 * 1000),
            });
          }

          return { userId, username, email };
        },

        // T-41: Cria bloqueio ativo para um identificador (GH-7 — bloqueio durante periodo de bloqueio)
        async createLoginBlock({ identifier }: { identifier: string }) {
          const blockedUntil = new Date(Date.now() + 15 * 60 * 1000); // +15 min

          // Remove bloqueio pre-existente para o mesmo identificador (evita duplicata)
          await db.delete(loginBlocks).where(eq(loginBlocks.identifier, identifier));

          await db.insert(loginBlocks).values({
            id: crypto.randomUUID(),
            identifier,
            blockedUntil,
          });

          return { blockedUntil: blockedUntil.toISOString() };
        },

        // T-40: Consulta bloqueio ativo para um identificador (GH-6, GH-7, GH-8)
        async getLoginBlockForIdentifier({ identifier }: { identifier: string }) {
          const rows = await db
            .select({ blockedUntil: loginBlocks.blockedUntil })
            .from(loginBlocks)
            .where(eq(loginBlocks.identifier, identifier))
            .limit(1);
          const blockedUntil = rows[0]?.blockedUntil ?? null;
          return blockedUntil ? new Date(blockedUntil).toISOString() : null;
        },
      });

      return config;
    },
  },
});

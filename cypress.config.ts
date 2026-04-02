import { defineConfig } from "cypress";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";
import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, varchar, mysqlEnum, date, timestamp } from "drizzle-orm/mysql-core";
import { eq } from "drizzle-orm";

// Schemas inline para uso nas tasks do Cypress (sem importar do src/ que usa aliases Next.js)
const users = mysqlTable("users", {
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

const confirmationTokens = mysqlTable("confirmation_tokens", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
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
      });

      return config;
    },
  },
});

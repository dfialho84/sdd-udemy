import { drizzle } from "drizzle-orm/mysql2";

// Singleton com guard para hot-reload do Next.js.
// Schema importado por feature conforme tabelas forem adicionadas em schema.ts.
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle>;
};

export const db =
  globalForDb.db ??
  drizzle(process.env.DATABASE_URL ?? "mysql://kanban:kanban@localhost:3306/kanban_db");

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

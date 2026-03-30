import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

// Singleton com guard para hot-reload do Next.js
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle>;
};

export const db =
  globalForDb.db ??
  drizzle({
    connection: { uri: process.env.DATABASE_URL! },
    schema,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

#!/usr/bin/env node
/**
 * Drop all tables in the database (including drizzle migrations table).
 * Does NOT drop the database itself.
 *
 * Usage: node scripts/drop-all-tables.js
 */

const mysql = require("mysql2/promise");
const path = require("path");

// Load .env or .env.local
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch {
  // dotenv optional
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL não definida.");
  process.exit(1);
}

async function dropAllTables() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Discover database name from current connection
    const [[{ db }]] = await connection.query("SELECT DATABASE() AS db");

    console.log(`Banco: ${db}`);

    // List all tables
    const [rows] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? ORDER BY TABLE_NAME",
      [db]
    );

    if (rows.length === 0) {
      console.log("Nenhuma tabela encontrada. Nada a fazer.");
      return;
    }

    console.log(
      `Tabelas encontradas (${rows.length}): ${rows.map((r) => r.TABLE_NAME).join(", ")}`
    );

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const { TABLE_NAME } of rows) {
      await connection.query(`DROP TABLE IF EXISTS \`${TABLE_NAME}\``);
      console.log(`  ✓ DROP TABLE ${TABLE_NAME}`);
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log(`\nPronto. ${rows.length} tabela(s) removida(s).`);
  } finally {
    await connection.end();
  }
}

dropAllTables().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});

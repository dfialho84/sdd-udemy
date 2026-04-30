#!/usr/bin/env node
/**
 * Seed de usuario para PT-3 — SLA de entrega do email de aviso (k6)
 * Rastreabilidade: T-63 · NFR-8
 *
 * Cria (ou recria) um usuario active com credenciais fixas usadas pelo
 * script k6/email-sla.load-test.js.
 *
 * Credenciais inseridas:
 *   username  : pt3-loadtest
 *   email     : pt3-loadtest@example.com
 *   password  : Senha@123Forte (senha correta — o teste envia senha ERRADA)
 *   id        : pt3-loadtest-user-id-fixed-uuid
 *
 * Uso:
 *   node scripts/seed-pt3-user.js
 *
 * Pre-condicao: banco de dados acessivel via DATABASE_URL
 *   export DATABASE_URL=mysql://kanban:kanban@localhost:3306/kanban_db
 */

const mysql = require("mysql2/promise");
const argon2 = require("argon2");
const path = require("path");

// Carrega variaveis de ambiente
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch {
  // dotenv opcional
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL nao definida.");
  process.exit(1);
}

// Credenciais fixas do usuario de carga PT-3
const PT3_USER = {
  id: "pt3-loadtest-user-id-fixed-uuid",
  name: "PT3 LoadTest User",
  username: "pt3-loadtest",
  email: "pt3-loadtest@example.com",
  password: "Senha@123Forte",
  birthDate: "1990-01-01",
};

async function seedPt3User() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    console.log("Gerando hash argon2id (pode levar alguns segundos)...");

    const passwordHash = await argon2.hash(PT3_USER.password, {
      type: argon2.argon2id,
      memoryCost: 64 * 1024, // 64 MB
      timeCost: 3,
      parallelism: 2,
    });

    console.log("Hash gerado. Inserindo usuario no banco...");

    // Remove registros pre-existentes para evitar unique constraint
    await connection.execute(
      "DELETE FROM login_blocks WHERE identifier = ? OR identifier = ?",
      [PT3_USER.username, PT3_USER.email],
    );
    await connection.execute(
      "DELETE FROM login_attempts WHERE identifier = ? OR identifier = ?",
      [PT3_USER.username, PT3_USER.email],
    );
    await connection.execute(
      "DELETE FROM confirmation_tokens WHERE user_id = ?",
      [PT3_USER.id],
    );
    await connection.execute(
      "DELETE FROM users WHERE id = ? OR username = ? OR email = ?",
      [PT3_USER.id, PT3_USER.username, PT3_USER.email],
    );

    // Insere usuario active
    await connection.execute(
      `INSERT INTO users (id, name, username, email, password_hash, birth_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [
        PT3_USER.id,
        PT3_USER.name,
        PT3_USER.username,
        PT3_USER.email,
        passwordHash,
        PT3_USER.birthDate,
      ],
    );

    console.log("");
    console.log("Usuario PT-3 criado com sucesso:");
    console.log(`  id       : ${PT3_USER.id}`);
    console.log(`  username : ${PT3_USER.username}`);
    console.log(`  email    : ${PT3_USER.email}`);
    console.log(`  password : ${PT3_USER.password}`);
    console.log(`  status   : active`);
    console.log("");
    console.log("Agora execute:");
    console.log("  npm run dev");
    console.log("  node k6/email-sla.load-test.js");
  } finally {
    await connection.end();
  }
}

seedPt3User().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});

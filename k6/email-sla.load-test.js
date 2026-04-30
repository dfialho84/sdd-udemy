#!/usr/bin/env node
// PT-3: SLA de entrega do email de aviso
// Rastreabilidade: T-63 · NFR-8
//
// Mede o tempo entre a tentativa de login com senha incorreta (resposta HTTP
// retornada) e a entrega do email de aviso no servidor SMTP (Mailhog).
//
// Metodo (test-strategy.md, PT-3):
//   1. Limpar inbox do Mailhog (DELETE /api/v1/messages)
//   2. Limpar login_attempts e login_blocks do identificador pt3-loadtest
//      (garante que o rate limiter nao bloqueia o identificador antes do 3o run)
//   3. Registrar timestamp antes do POST de login com senha incorreta
//   4. Enviar POST /api/auth/callback/credentials com identificador valido + senha ERRADA
//   5. Consultar GET /api/v2/messages a cada 30 segundos ate receber o email
//      ou atingir 5 minutos (300 segundos)
//   6. Registrar latencia (ms entre o POST e a deteccao do email)
//   7. Repetir 10 vezes — todas devem passar o SLA de 5 minutos (NFR-8)
//
// Threshold (NFR-8): email entregue em ate 5 minutos (300 000 ms)
//
// Uso:
//   1. Crie o usuario de teste no banco:
//        node scripts/seed-pt3-user.js
//   2. Suba a aplicacao e o Mailhog:
//        docker compose up -d mailhog mysql
//        npm run dev
//   3. Execute o teste:
//        node k6/email-sla.load-test.js
//
// Pre-condicoes:
//   - Aplicacao rodando em http://localhost:3000
//   - Mailhog rodando em http://localhost:8025
//   - Banco de dados acessivel via DATABASE_URL
//   - Usuario pt3-loadtest com senha Senha@123Forte existente e status active
//     (crie com: node scripts/seed-pt3-user.js)

const http = require("http");
const https = require("https");
const path = require("path");

// Carrega variaveis de ambiente
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch {
  // dotenv opcional
}

// ---------------------------------------------------------------------------
// Configuracao
// ---------------------------------------------------------------------------

const APP_BASE_URL = process.env.APP_URL || "http://localhost:3000";
const MAILHOG_API_URL = process.env.MAILHOG_URL || "http://localhost:8025";
const DATABASE_URL = process.env.DATABASE_URL;

const IDENTIFIER = "pt3-loadtest";
const WRONG_PASSWORD = "SenhaErrada@999";
const RECIPIENT_EMAIL = "pt3-loadtest@example.com";

const SLA_MS = 5 * 60 * 1000;         // 5 minutos em ms
const POLL_INTERVAL_MS = 30 * 1000;    // 30 segundos entre consultas ao Mailhog
const TOTAL_RUNS = 10;                 // 10 execucoes conforme test-strategy.md

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL nao definida.");
  console.error(
    "Defina: export DATABASE_URL=mysql://kanban:kanban@localhost:3306/kanban_db"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Utilitarios HTTP
// ---------------------------------------------------------------------------

/**
 * Faz uma requisicao HTTP/HTTPS e retorna { status, headers, body }.
 */
function request(method, url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on("error", reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Aguarda ms milissegundos.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Banco de dados — reset do estado do rate limiter entre runs
// ---------------------------------------------------------------------------

let dbConnection = null;

async function getDbConnection() {
  if (dbConnection) return dbConnection;
  const mysql = require("mysql2/promise");
  dbConnection = await mysql.createConnection(DATABASE_URL);
  return dbConnection;
}

/**
 * Remove login_attempts e login_blocks para o identificador pt3-loadtest.
 * Garante que cada run comeca com contagem de falhas zerada (evita bloqueio
 * prematuro pelo rate limiter apos 3 tentativas — REQ-8).
 */
async function resetRateLimiterState() {
  const conn = await getDbConnection();
  await conn.execute(
    "DELETE FROM login_blocks WHERE identifier = ?",
    [IDENTIFIER]
  );
  await conn.execute(
    "DELETE FROM login_attempts WHERE identifier = ?",
    [IDENTIFIER]
  );
}

// ---------------------------------------------------------------------------
// Operacoes Mailhog
// ---------------------------------------------------------------------------

/**
 * Limpa todos os emails da inbox do Mailhog.
 * Usa DELETE /api/v1/messages conforme test-strategy.md.
 */
async function clearMailhogInbox() {
  const res = await request("DELETE", `${MAILHOG_API_URL}/api/v1/messages`);
  if (res.status !== 200 && res.status !== 204) {
    throw new Error(
      `Falha ao limpar inbox do Mailhog: HTTP ${res.status} — ${res.body}`
    );
  }
}

/**
 * Consulta a API do Mailhog e conta os emails para o recipient.
 * Usa GET /api/v2/messages conforme test-strategy.md.
 */
async function countMailhogMessages(recipientEmail) {
  const res = await request("GET", `${MAILHOG_API_URL}/api/v2/messages`);

  if (res.status !== 200) {
    throw new Error(
      `Falha ao consultar Mailhog: HTTP ${res.status} — ${res.body}`
    );
  }

  let data;
  try {
    data = JSON.parse(res.body);
  } catch {
    throw new Error(`Resposta invalida do Mailhog: ${res.body}`);
  }

  // data.items e o array de mensagens na API v2 do Mailhog
  const items = data.items || [];
  return items.filter((msg) => {
    const to = msg.To || [];
    return to.some(
      (addr) =>
        (addr.Mailbox + "@" + addr.Domain).toLowerCase() ===
        recipientEmail.toLowerCase()
    );
  }).length;
}

// ---------------------------------------------------------------------------
// Operacoes de login
// ---------------------------------------------------------------------------

/**
 * Obtem o CSRF token do NextAuth via GET /api/auth/csrf.
 */
async function fetchCsrfToken() {
  const res = await request("GET", `${APP_BASE_URL}/api/auth/csrf`);

  if (res.status !== 200) {
    throw new Error(
      `Falha ao obter CSRF token: HTTP ${res.status} — ${res.body}`
    );
  }

  let body;
  try {
    body = JSON.parse(res.body);
  } catch {
    throw new Error(`Resposta invalida do endpoint CSRF: ${res.body}`);
  }

  const csrfToken = body.csrfToken;
  if (!csrfToken) {
    throw new Error("csrfToken ausente na resposta do endpoint CSRF");
  }

  // Extrai o cookie de CSRF do header Set-Cookie
  const setCookie = res.headers["set-cookie"] || [];
  const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;
  const match = cookieStr.match(/authjs\.csrf-token=([^;]+)/);
  const csrfCookieValue = match ? match[1] : "";

  return { csrfToken, csrfCookieValue };
}

/**
 * Envia uma tentativa de login com senha INCORRETA para disparar o email de aviso.
 * Retorna o timestamp (ms) imediatamente apos o POST retornar resposta HTTP.
 *
 * Espera HTTP 200 com url contendo /error (falha de autenticacao — NFR-6: mensagem generica)
 * ou HTTP 401 dependendo da configuracao do NextAuth.
 */
async function triggerFailedLogin(csrfToken, csrfCookieValue) {
  const payload =
    `csrfToken=${encodeURIComponent(csrfToken)}` +
    `&identifier=${encodeURIComponent(IDENTIFIER)}` +
    `&password=${encodeURIComponent(WRONG_PASSWORD)}` +
    `&callbackUrl=${encodeURIComponent(APP_BASE_URL + "/login")}` +
    `&json=true`;

  const triggerTs = Date.now();

  const res = await request(
    "POST",
    `${APP_BASE_URL}/api/auth/callback/credentials`,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(csrfCookieValue
          ? { Cookie: `authjs.csrf-token=${csrfCookieValue}` }
          : {}),
      },
      body: payload,
    }
  );

  if (res.status === 0) {
    throw new Error(
      "Sem resposta do servidor — verifique se npm run dev esta rodando"
    );
  }

  // Verifica que a tentativa foi processada (nao apenas rejeitada por CSRF invalido)
  if (res.status === 403) {
    throw new Error(
      `CSRF invalido (HTTP 403) — verifique o cookie e token CSRF: ${res.body}`
    );
  }

  return triggerTs;
}

// ---------------------------------------------------------------------------
// Loop de verificacao do SLA
// ---------------------------------------------------------------------------

/**
 * Aguarda ate o email aparecer no Mailhog ou o SLA expirar.
 * Consulta a cada POLL_INTERVAL_MS conforme test-strategy.md.
 */
async function waitForEmail(triggerTs) {
  const deadline = triggerTs + SLA_MS;

  // Primeira verificacao imediata (email pode ser sincrono/rapido)
  const immediate = await countMailhogMessages(RECIPIENT_EMAIL);
  if (immediate > 0) {
    return { delivered: true, latencyMs: Date.now() - triggerTs };
  }

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const waitMs = Math.min(POLL_INTERVAL_MS, remaining);
    console.log(
      `  Aguardando... (${Math.ceil(remaining / 1000)}s restantes para o SLA)`
    );
    await sleep(waitMs);

    const count = await countMailhogMessages(RECIPIENT_EMAIL);
    if (count > 0) {
      return { delivered: true, latencyMs: Date.now() - triggerTs };
    }
  }

  return { delivered: false, latencyMs: Date.now() - triggerTs };
}

// ---------------------------------------------------------------------------
// Runner principal
// ---------------------------------------------------------------------------

async function runPt3() {
  console.log("PT-3: SLA de entrega do email de aviso");
  console.log("Rastreabilidade: T-63 · NFR-8");
  console.log(`Threshold: email entregue em ate ${SLA_MS / 1000}s`);
  console.log(`Execucoes: ${TOTAL_RUNS}`);
  console.log(`Polling: a cada ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`App: ${APP_BASE_URL}`);
  console.log(`Mailhog: ${MAILHOG_API_URL}`);
  console.log("---");

  const results = [];

  for (let run = 1; run <= TOTAL_RUNS; run++) {
    console.log(`\n[Run ${run}/${TOTAL_RUNS}] Iniciando...`);

    // 1. Resetar estado do rate limiter no banco (evita bloqueio apos 3 tentativas)
    try {
      await resetRateLimiterState();
      console.log("  Estado do rate limiter resetado.");
    } catch (err) {
      console.error(`  ERRO ao resetar rate limiter: ${err.message}`);
      results.push({ run, delivered: false, latencyMs: -1, slaOk: false, error: err.message });
      continue;
    }

    // 2. Limpar inbox do Mailhog antes de cada execucao
    try {
      await clearMailhogInbox();
      console.log("  Inbox do Mailhog limpa.");
    } catch (err) {
      console.error(`  ERRO ao limpar inbox: ${err.message}`);
      results.push({ run, delivered: false, latencyMs: -1, slaOk: false, error: err.message });
      continue;
    }

    // 3. Obter CSRF token
    let csrfToken, csrfCookieValue;
    try {
      ({ csrfToken, csrfCookieValue } = await fetchCsrfToken());
    } catch (err) {
      console.error(`  ERRO ao obter CSRF token: ${err.message}`);
      results.push({ run, delivered: false, latencyMs: -1, slaOk: false, error: err.message });
      continue;
    }

    // 4. Enviar login com senha errada e registrar timestamp
    let triggerTs;
    try {
      triggerTs = await triggerFailedLogin(csrfToken, csrfCookieValue);
      console.log(
        `  Login com senha incorreta enviado em ${new Date(triggerTs).toISOString()}`
      );
    } catch (err) {
      console.error(`  ERRO ao disparar login: ${err.message}`);
      results.push({ run, delivered: false, latencyMs: -1, slaOk: false, error: err.message });
      continue;
    }

    // 5. Aguardar email (polling a cada 30s ate 5min)
    console.log(`  Aguardando email para ${RECIPIENT_EMAIL}...`);
    const { delivered, latencyMs } = await waitForEmail(triggerTs);

    const latencySec = (latencyMs / 1000).toFixed(1);
    const slaOk = delivered && latencyMs <= SLA_MS;

    if (delivered) {
      console.log(
        `  [${slaOk ? "PASS" : "FAIL — SLA violado"}] Email entregue em ${latencySec}s`
      );
    } else {
      console.log(
        `  [FAIL] Email NAO entregue dentro de ${SLA_MS / 1000}s`
      );
    }

    results.push({ run, delivered, latencyMs, slaOk, error: null });

    // Pequena pausa entre runs
    if (run < TOTAL_RUNS) {
      await sleep(2000);
    }
  }

  // Fecha conexao com o banco
  if (dbConnection) {
    await dbConnection.end();
  }

  // ---------------------------------------------------------------------------
  // Relatorio final
  // ---------------------------------------------------------------------------
  console.log("\n=== RELATORIO PT-3 ===");

  const passed = results.filter((r) => r.slaOk).length;
  const failed = results.filter((r) => !r.slaOk).length;

  console.log(`Execucoes: ${TOTAL_RUNS}`);
  console.log(`Aprovadas (SLA <= ${SLA_MS / 1000}s): ${passed}`);
  console.log(`Reprovadas: ${failed}`);
  console.log("");
  console.log("Detalhes:");

  for (const r of results) {
    const latStr =
      r.latencyMs > 0 ? `${(r.latencyMs / 1000).toFixed(1)}s` : "N/A";
    const status = r.slaOk ? "PASS" : "FAIL";
    const detail = r.error
      ? `ERRO: ${r.error}`
      : r.delivered
        ? `entregue em ${latStr}`
        : "nao entregue";
    console.log(`  Run ${String(r.run).padStart(2, "0")}: [${status}] ${detail}`);
  }

  // Estatisticas de latencia
  const latencies = results
    .filter((r) => r.delivered && r.latencyMs > 0)
    .map((r) => r.latencyMs);

  if (latencies.length > 0) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || sorted[0];
    const p95 =
      sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    console.log("");
    console.log("Estatisticas de latencia (execucoes com email entregue):");
    console.log(`  min : ${(min / 1000).toFixed(1)}s`);
    console.log(`  p50 : ${(p50 / 1000).toFixed(1)}s`);
    console.log(`  p95 : ${(p95 / 1000).toFixed(1)}s`);
    console.log(`  max : ${(max / 1000).toFixed(1)}s`);
  }

  console.log("");

  // Criterio de aprovacao: 10/10 execucoes dentro do SLA (test-strategy.md, PT-3)
  if (passed === TOTAL_RUNS) {
    console.log(
      `RESULTADO: APROVADO — ${passed}/${TOTAL_RUNS} execucoes confirmam SLA de ${SLA_MS / 1000}s (NFR-8)`
    );
    process.exit(0);
  } else {
    console.log(
      `RESULTADO: REPROVADO — ${failed}/${TOTAL_RUNS} execucoes violaram o SLA de ${SLA_MS / 1000}s (NFR-8)`
    );
    process.exit(1);
  }
}

runPt3().catch((err) => {
  if (dbConnection) {
    dbConnection.end().catch(() => {});
  }
  console.error("Erro fatal:", err.message);
  process.exit(1);
});

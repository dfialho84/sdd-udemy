// k6 load test — PT-1: Latencia de autenticacao bem-sucedida (p95)
// Rastreabilidade: T-61 · NFR-1
//
// Envia 100 requisicoes/segundo para POST /api/auth/callback/credentials com
// credenciais validas durante 60 segundos e verifica que p95 <= 2000 ms.
//
// Threshold (NFR-1): p95 de latencia <= 2000ms
//
// Uso:
//   1. Crie o usuario de teste no banco:
//        node scripts/seed-pt1-user.js
//   2. Suba a aplicacao:
//        npm run dev
//   3. Execute o teste:
//        k6 run k6/authenticate-user.load-test.js
//
// Pre-condicoes:
//   - Aplicacao rodando em http://localhost:3000
//   - Banco de dados acessivel
//   - Usuario pt1-loadtest com senha Senha@123Forte existente e status active
//     (crie com: node scripts/seed-pt1-user.js)

import http from "k6/http";
import { check } from "k6";
import { Counter, Trend } from "k6/metrics";

// Metricas customizadas
const authSuccess = new Counter("pt1_auth_success");
const authFailure = new Counter("pt1_auth_failure");
const csrfFetchFailure = new Counter("pt1_csrf_fetch_failure");
const authLatency = new Trend("pt1_auth_latency_ms", true);

// Credenciais fixas do usuario de carga (criado via scripts/seed-pt1-user.js)
const IDENTIFIER = "pt1-loadtest";
const PASSWORD = "Senha@123Forte";
const BASE_URL = "http://localhost:3000";

export const options = {
  // Executor constant-arrival-rate: dispara exatamente 100 iteracoes/segundo
  // independentemente do tempo de resposta, respeitando o requisito do PT-1.
  scenarios: {
    constant_load: {
      executor: "constant-arrival-rate",
      rate: 100,          // 100 iteracoes por timeUnit
      timeUnit: "1s",     // = 100 req/s
      duration: "60s",    // 60 segundos de carga sustentada
      preAllocatedVUs: 50,  // VUs pre-alocados para absorver a carga
      maxVUs: 200,          // limite superior em caso de latencia elevada
    },
  },

  thresholds: {
    // p95 de latencia do POST de autenticacao deve ser <= 2000ms (NFR-1)
    "http_req_duration{name:POST_auth_callback}": ["p(95)<2000"],

    // Latencia customizada das autenticacoes bem-sucedidas tambem deve respeitar NFR-1
    pt1_auth_latency_ms: ["p(95)<2000"],

    // Taxa de erros HTTP deve ser < 5% (tolerancia para erros de infra)
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  // Passo 1: Obter CSRF token via GET /api/auth/csrf
  // O NextAuth exige o csrfToken para proteger o endpoint de callback de CSRF.
  // O token e valido por sessao — cada VU obtem o seu proprio.
  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`, {
    tags: { name: "GET_csrf" },
  });

  const csrfOk = check(csrfRes, {
    "GET /api/auth/csrf retorna HTTP 200": (r) => r.status === 200,
  });

  if (!csrfOk) {
    csrfFetchFailure.add(1);
    return;
  }

  let csrfToken;
  try {
    const body = JSON.parse(csrfRes.body);
    csrfToken = body.csrfToken;
  } catch {
    csrfFetchFailure.add(1);
    return;
  }

  if (!csrfToken) {
    csrfFetchFailure.add(1);
    return;
  }

  // Extrai o cookie de CSRF para enviar junto com o POST
  // O NextAuth valida que o csrfToken do body corresponde ao cookie authjs.csrf-token
  const csrfCookieHeader = csrfRes.headers["Set-Cookie"] || "";
  const csrfCookieMatch = csrfCookieHeader.match(/authjs\.csrf-token=([^;]+)/);
  const csrfCookieValue = csrfCookieMatch ? csrfCookieMatch[1] : "";

  // Passo 2: POST /api/auth/callback/credentials com csrfToken + credenciais
  // O corpo e enviado como application/x-www-form-urlencoded (padrao do NextAuth).
  const authStart = Date.now();

  const authPayload =
    `csrfToken=${encodeURIComponent(csrfToken)}` +
    `&identifier=${encodeURIComponent(IDENTIFIER)}` +
    `&password=${encodeURIComponent(PASSWORD)}` +
    `&callbackUrl=${encodeURIComponent(BASE_URL + "/login")}` +
    `&json=true`;

  const authRes = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    authPayload,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Envia o cookie CSRF para que o NextAuth valide o token do body
        ...(csrfCookieValue
          ? { Cookie: `authjs.csrf-token=${csrfCookieValue}` }
          : {}),
        // Simula IP distinto por iteracao para nao disparar o rate limiter (NFR-3, NFR-4).
        // Em producao cada usuario vem de um IP diferente.
        "X-Forwarded-For": `10.${Math.floor(__VU / 256) % 256}.${__VU % 256}.${__ITER % 256}`,
      },
      redirects: 0, // Nao segue redirects — mede apenas a latencia do endpoint
      tags: { name: "POST_auth_callback" },
    },
  );

  const authDuration = Date.now() - authStart;
  authLatency.add(authDuration);

  // O NextAuth com json=true retorna HTTP 200 + { url: "..." } em caso de sucesso.
  // Sem json=true retornaria HTTP 302. Ambos indicam autenticacao bem-sucedida.
  const authOk = check(authRes, {
    "POST /api/auth/callback/credentials retorna HTTP 200 ou 302": (r) =>
      r.status === 200 || r.status === 302,
    "resposta indica autenticacao bem-sucedida": (r) => {
      // Com json=true: status 200 + body com url sem "/error"
      if (r.status === 200) {
        try {
          const body = JSON.parse(r.body);
          return body.url && !body.url.includes("error");
        } catch {
          return false;
        }
      }
      // Com redirect: status 302 + Location sem "/error"
      if (r.status === 302) {
        const location = r.headers["Location"] || "";
        return !location.includes("error");
      }
      return false;
    },
  });

  if (authOk) {
    authSuccess.add(1);
  } else {
    authFailure.add(1);
  }
}

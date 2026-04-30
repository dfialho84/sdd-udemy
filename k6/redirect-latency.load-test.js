// k6 load test — PT-2: Latencia de redirecionamento pos-autenticacao (p95)
// Rastreabilidade: T-62 · NFR-2
//
// Mede o tempo entre a conclusao da autenticacao bem-sucedida e o recebimento
// da resposta de redirecionamento para /users/<id> pelo cliente.
//
// Metodo: POST /api/auth/callback/credentials SEM json=true e SEM seguir
// redirects (redirects: 0). O NextAuth retorna HTTP 302 com header Location
// apontando para o callbackUrl (/users/<id>). O tempo de resposta desse POST
// e o que estamos medindo — ele ja inclui a latencia de autenticacao + o tempo
// para montar o redirect. O p95 desse tempo deve ser <= 500ms (NFR-2).
//
// Threshold (NFR-2): p95 de latencia do redirect <= 500ms
//
// Uso:
//   1. Crie o usuario de teste no banco:
//        node scripts/seed-pt2-user.js
//   2. Suba a aplicacao:
//        npm run dev
//   3. Execute o teste:
//        k6 run k6/redirect-latency.load-test.js
//
// Pre-condicoes:
//   - Aplicacao rodando em http://localhost:3000
//   - Banco de dados acessivel
//   - Usuario pt2-loadtest com senha Senha@123Forte existente e status active
//     (crie com: node scripts/seed-pt2-user.js)

import http from "k6/http";
import { check } from "k6";
import { Counter, Trend } from "k6/metrics";

// Metricas customizadas
const redirectSuccess = new Counter("pt2_redirect_success");
const redirectFailure = new Counter("pt2_redirect_failure");
const csrfFetchFailure = new Counter("pt2_csrf_fetch_failure");
const redirectLatency = new Trend("pt2_redirect_latency_ms", true);

// Credenciais fixas do usuario de carga (criado via scripts/seed-pt2-user.js)
const USER_ID = "pt2-loadtest-user-id-fixed-uuid";
const IDENTIFIER = "pt2-loadtest";
const PASSWORD = "Senha@123Forte";
const BASE_URL = "http://localhost:3000";

// callbackUrl aponta para /users/<id> — o destino do redirect pos-autenticacao (NFR-2)
const CALLBACK_URL = `${BASE_URL}/users/${USER_ID}`;

export const options = {
  // Executor constant-arrival-rate: dispara exatamente 100 iteracoes/segundo
  // independentemente do tempo de resposta, respeitando o requisito do PT-2.
  scenarios: {
    constant_load: {
      executor: "constant-arrival-rate",
      rate: 100,           // 100 iteracoes por timeUnit
      timeUnit: "1s",      // = 100 req/s
      duration: "60s",     // 60 segundos de carga sustentada
      preAllocatedVUs: 50, // VUs pre-alocados para absorver a carga
      maxVUs: 200,         // limite superior em caso de latencia elevada
    },
  },

  thresholds: {
    // p95 de latencia do redirect deve ser <= 500ms (NFR-2)
    "http_req_duration{name:POST_auth_redirect}": ["p(95)<500"],

    // Latencia customizada das requisicoes com redirect bem-sucedido
    pt2_redirect_latency_ms: ["p(95)<500"],

    // Taxa de erros HTTP deve ser < 5% (tolerancia para erros de infra)
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  // Passo 1: Obter CSRF token via GET /api/auth/csrf
  // O NextAuth exige o csrfToken para proteger o endpoint de callback de CSRF.
  // O token e valido por sessao — cada VU obtem o seu proprio.
  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`, {
    tags: { name: "GET_csrf_pt2" },
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

  // Passo 2: POST /api/auth/callback/credentials SEM json=true
  // Sem json=true, o NextAuth retorna HTTP 302 com Location: callbackUrl
  // (aqui /users/<id>). O tempo de resposta desse POST e a "latencia de
  // redirecionamento" definida no NFR-2.
  const redirectStart = Date.now();

  const authPayload =
    `csrfToken=${encodeURIComponent(csrfToken)}` +
    `&identifier=${encodeURIComponent(IDENTIFIER)}` +
    `&password=${encodeURIComponent(PASSWORD)}` +
    `&callbackUrl=${encodeURIComponent(CALLBACK_URL)}`;
  // Nota: sem &json=true — isso faz o NextAuth retornar 302 em vez de 200+JSON

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
      redirects: 0, // Nao segue redirects — mede apenas a latencia do redirect response
      tags: { name: "POST_auth_redirect" },
    },
  );

  const redirectDuration = Date.now() - redirectStart;
  redirectLatency.add(redirectDuration);

  // Verificacoes do redirect:
  //   - HTTP 302 (redirect) com Location apontando para /users/<id>
  //   - OU HTTP 200 com json=false (comportamento alternativo do NextAuth)
  const redirectOk = check(authRes, {
    "POST retorna HTTP 302 (redirect)": (r) => r.status === 302,
    "Location header aponta para /users/<id>": (r) => {
      const location = r.headers["Location"] || r.headers["location"] || "";
      return location.includes(`/users/${USER_ID}`);
    },
  });

  if (redirectOk) {
    redirectSuccess.add(1);
  } else {
    redirectFailure.add(1);
  }
}

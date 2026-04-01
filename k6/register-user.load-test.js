// k6 load test — PT-1: Latência de POST /api/auth/register sob carga
// Rastreabilidade: NFR-1 · T-23
//
// Executa 10 usuários virtuais simultâneos por 60 segundos enviando dados válidos.
// Threshold: p95 de latência <= 3.000 ms.
//
// Uso:
//   k6 run k6/register-user.load-test.js
//
// Pré-condição: aplicação rodando em http://localhost:3000
//   npm run dev

import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";

// Contadores de status para facilitar análise
const successCount = new Counter("register_success");
const errorCount = new Counter("register_error");

export const options = {
  // 10 usuários virtuais simultâneos por 60 segundos (NFR-1 · PT-1)
  vus: 10,
  duration: "60s",

  thresholds: {
    // p95 de latência deve ser <= 3.000 ms (NFR-1)
    http_req_duration: ["p(95)<3000"],

    // Taxa de erros HTTP deve ser < 5% (falhas de infraestrutura, não de negócio)
    http_req_failed: ["rate<0.05"],
  },
};

// Gera dados únicos por VU + iteração para evitar conflito de email
export default function () {
  const vuId = __VU;
  const iter = __ITER;
  const timestamp = Date.now();

  const payload = JSON.stringify({
    name: `Usuário Teste ${vuId}-${iter}`,
    email: `loadtest+vu${vuId}iter${iter}ts${timestamp}@example.com`,
    password: "Senha@123Forte",
    passwordConfirmation: "Senha@123Forte",
    birthDate: "1990-01-01",
  });

  // Cada iteração usa um IP virtualmente único para não disparar o rate limiter (NFR-4).
  // O rate limiter limita 3 tentativas por IP em 15 min — em carga real cada usuário
  // vem de um IP diferente. Usamos o índice da iteração global para garantir unicidade.
  const iterIndex = (vuId - 1) * 10000 + iter;
  const ip3 = Math.floor(iterIndex / 256) % 256;
  const ip4 = iterIndex % 256;
  const simulatedIp = `10.${Math.floor(iterIndex / 65536) % 256}.${ip3}.${ip4}`;

  const params = {
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": simulatedIp,
    },
  };

  const res = http.post(
    "http://localhost:3000/api/auth/register",
    payload,
    params,
  );

  // Verifica se a resposta é um sucesso esperado ou um erro de negócio aceitável
  // HTTP 200 = cadastro criado com sucesso
  // HTTP 409 = email duplicado (pode ocorrer em reruns) — não conta como falha de infra
  const success = check(res, {
    "status é 200 ou 409": (r) => r.status === 200 || r.status === 409,
    "resposta tem corpo JSON": (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });

  if (res.status === 200) {
    successCount.add(1);
  } else if (res.status >= 500) {
    errorCount.add(1);
  }

  // Pequena pausa entre iterações para evitar sobrecarga excessiva no Mailhog/SMTP
  sleep(0.5);
}

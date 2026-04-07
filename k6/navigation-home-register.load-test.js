// k6 load test — PT-1: Latencia de navegacao home -> /register
// Rastreabilidade: T-69 · NFR-1 · REQ-1
//
// Simula 10 usuarios virtuais simultaneos por 60 segundos executando o ciclo:
//   GET / seguido de GET /register
//
// Threshold: p95 de latencia do ciclo completo <= 1.000 ms (NFR-1)
//
// Uso:
//   k6 run k6/navigation-home-register.load-test.js
//
// Pre-condicao: aplicacao rodando em http://localhost:3000

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

// Metrica customizada para medir o tempo total do ciclo home -> /register
const cycleLatency = new Trend("cycle_home_to_register_ms", true);

export const options = {
  // 10 usuarios virtuais simultaneos por 60 segundos (PT-1)
  vus: 10,
  duration: "60s",

  thresholds: {
    // p95 de latencia de cada requisicao individual <= 1.000 ms (NFR-1)
    http_req_duration: ["p(95)<1000"],

    // p95 do ciclo completo (GET / + GET /register) <= 1.000 ms
    cycle_home_to_register_ms: ["p(95)<1000"],

    // Taxa de erros HTTP deve ser 0%
    http_req_failed: ["rate==0"],
  },
};

export default function () {
  const baseUrl = "http://localhost:3000";

  // Marca inicio do ciclo
  const cycleStart = Date.now();

  // Passo 1: GET /
  const homeRes = http.get(`${baseUrl}/`, {
    tags: { name: "GET_home" },
  });

  check(homeRes, {
    "GET / retorna HTTP 200": (r) => r.status === 200,
  });

  // Passo 2: GET /register
  const registerRes = http.get(`${baseUrl}/register`, {
    tags: { name: "GET_register" },
  });

  check(registerRes, {
    "GET /register retorna HTTP 200": (r) => r.status === 200,
  });

  // Registra latencia total do ciclo
  const cycleDuration = Date.now() - cycleStart;
  cycleLatency.add(cycleDuration);

  // Pequena pausa entre ciclos para simular comportamento real do usuario
  sleep(0.1);
}

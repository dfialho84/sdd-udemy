// k6 load test — PT-4: Verificação de unicidade de username com índice UNIQUE sob carga
// Rastreabilidade: T-81 · NFR-6 · DT-10
//
// Mede o tempo de execução isolado de DrizzleUserRepository.findByUsername()
// com o índice UNIQUE ativo, simulando verificações concorrentes de unicidade.
//
// Thresholds (NFR-6):
//   - p95 da consulta findByUsername <= 50 ms
//   - pelo menos 200 verificações de unicidade executadas
//
// Método de medição:
//   Chama o endpoint auxiliar GET /api/test/find-by-username?username=<valor>
//   que executa findByUsername() e retorna o durationMs medido via performance.now().
//   O endpoint só está disponível em NODE_ENV != production.
//
// Uso:
//   k6 run k6/username-uniqueness.load-test.js
//
// Pré-condições:
//   - Aplicação rodando em http://localhost:3000 com NODE_ENV=development
//   - Banco de dados acessível com migração de índice UNIQUE em username aplicada

import http from "k6/http";
import { check } from "k6";
import { Counter, Trend } from "k6/metrics";

// Métricas customizadas para PT-4
const findByUsernameLatency = new Trend("find_by_username_duration_ms", true);
const totalChecks = new Counter("uniqueness_checks_total");
const errorCount = new Counter("pt4_errors");

export const options = {
  // 50 usuários virtuais simultâneos por 60 segundos (NFR-6 · PT-4)
  vus: 50,
  duration: "60s",

  thresholds: {
    // p95 da consulta findByUsername deve ser <= 50 ms (NFR-6)
    find_by_username_duration_ms: ["p(95)<=50"],

    // Taxa de erros HTTP deve ser < 1% (falhas de infraestrutura)
    http_req_failed: ["rate<0.01"],

    // Mínimo de 200 verificações de unicidade executadas com sucesso
    uniqueness_checks_total: ["count>=200"],
  },
};

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // Username único por VU + iteração garante ausência de cache e unicidade real
  const username = `ptuser_vu${vuId}_iter${iter}_${Date.now()}`;

  const res = http.get(
    `http://localhost:3000/api/test/find-by-username?username=${encodeURIComponent(username)}`,
    {
      headers: { "Content-Type": "application/json" },
      tags: { test: "pt4-username-uniqueness" },
    },
  );

  const success = check(res, {
    "status 200": (r) => r.status === 200,
    "resposta contém durationMs": (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.durationMs === "number";
      } catch {
        return false;
      }
    },
  });

  if (success && res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      if (typeof body.durationMs === "number") {
        // Registra o tempo real de execução do findByUsername (medido no servidor)
        findByUsernameLatency.add(body.durationMs);
        totalChecks.add(1);
      }
    } catch {
      errorCount.add(1);
    }
  } else {
    errorCount.add(1);
  }
}

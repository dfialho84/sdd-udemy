import pino from "pino";
import pretty from "pino-pretty";
import type { LokiOptions } from "pino-loki";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Em desenvolvimento: usa pino-pretty para output colorido no terminal.
 * Fora de desenvolvimento: usa pino-loki como transport para enviar logs
 * ao Grafana Loki (LOKI_URL, default http://localhost:3100).
 */
function buildTransport():
  | ReturnType<typeof pretty>
  | ReturnType<typeof pino.transport>
  | undefined {
  if (isDevelopment) {
    return pretty({ colorize: true, sync: true });
  }

  const lokiUrl = process.env.LOKI_URL ?? "http://localhost:3100";

  return pino.transport<LokiOptions>({
    target: "pino-loki",
    options: {
      host: lokiUrl,
      labels: { job: "kanban-app" },
    },
  });
}

const transport = buildTransport();

export const logger = transport
  ? pino({ level: process.env.LOG_LEVEL ?? "info" }, transport)
  : pino({ level: process.env.LOG_LEVEL ?? "info" });

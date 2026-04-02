import pino from "pino";
import pretty from "pino-pretty";

const stream =
  process.env.NODE_ENV === "development"
    ? pretty({ colorize: true, sync: true })
    : undefined;

export const logger = stream
  ? pino({ level: process.env.LOG_LEVEL ?? "info" }, stream)
  : pino({ level: process.env.LOG_LEVEL ?? "info" });

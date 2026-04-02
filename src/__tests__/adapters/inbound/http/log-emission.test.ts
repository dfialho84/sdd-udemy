// Teste de integração T-54 — Verificação de emissão de logs estruturados JSON
// Confirma que logs JSON são emitidos nos cinco eventos críticos de NFR-6 e NFR-7.
// Rastreabilidade: T-54 · NFR-6 · NFR-7
//
// Eventos verificados:
//   - criação de cadastro (tipoEvento: "cadastro_criado") — NFR-6
//   - falha de envio de email (tipoEvento: "falha_envio_email") — NFR-6
//   - confirmação bem-sucedida (resultado: "confirmacao_sucedida") — NFR-7
//   - link expirado (resultado: "link_expirado") — NFR-7
//   - link já utilizado (resultado: "link_ja_utilizado") — NFR-7
//
// Pré-requisitos:
//   - banco MySQL de teste rodando com migration aplicada (kanban_mysql)
//   - DATABASE_URL apontando para o banco de teste

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import { GET } from "@/app/api/auth/confirm/route";
import {
  setDepsFactory as setRegisterDeps,
  resetDepsFactory as resetRegisterDeps,
  type RegisterHandlerDeps,
} from "@/app/api/auth/register/deps";
import {
  setDepsFactory as setConfirmDeps,
  resetDepsFactory as resetConfirmDeps,
} from "@/app/api/auth/confirm/deps";
import { db } from "@/lib/db";
import { users, confirmationTokens } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";
import { registerRateLimiter } from "@/adapters/inbound/http/rate-limiter";
import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import { DrizzleConfirmationTokenRepository } from "@/adapters/outbound/persistence/drizzle-confirmation-token-repository";
import { Argon2PasswordHasher } from "@/adapters/outbound/persistence/argon2-password-hasher";
import { CryptoTokenGenerator } from "@/adapters/outbound/persistence/crypto-token-generator";
import { MailhogEmailAdapter } from "@/adapters/outbound/email/mailhog-email-adapter";
import { LocalAvatarStorageAdapter } from "@/adapters/outbound/storage/local-avatar-storage.adapter";
import type { ConfirmAccountUseCaseDeps } from "@/application/use-cases/confirm-account.use-case";

// Logger mock que captura todas as chamadas para verificacao
interface LogEntry {
  level: "info" | "error";
  obj: object;
  msg?: string;
}

function createMockLogger(): {
  info: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
  calls: LogEntry[];
  reset: () => void;
} {
  const calls: LogEntry[] = [];
  return {
    calls,
    reset: () => { calls.length = 0; },
    info: (obj: object, msg?: string) => {
      calls.push({ level: "info", obj, msg });
    },
    error: (obj: object, msg?: string) => {
      calls.push({ level: "error", obj, msg });
    },
  };
}

const mockLogger = createMockLogger();

// Fabrica de dependencias de registro com logger mock
function buildRegisterDepsWithMockLogger(): RegisterHandlerDeps {
  return {
    userRepository: new DrizzleUserRepository(),
    confirmationTokenRepository: new DrizzleConfirmationTokenRepository(),
    passwordHasher: new Argon2PasswordHasher(),
    tokenGenerator: new CryptoTokenGenerator(),
    emailService: new MailhogEmailAdapter(),
    avatarStorageAdapter: new LocalAvatarStorageAdapter(),
    appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
    logger: mockLogger,
  };
}

// Fabrica de dependencias de confirmacao com logger mock
function buildConfirmDepsWithMockLogger(): ConfirmAccountUseCaseDeps {
  return {
    confirmationTokenRepository: new DrizzleConfirmationTokenRepository(),
    userRepository: new DrizzleUserRepository(),
    appBaseUrl: process.env.NEXT_PUBLIC_APP_BASE_URL ?? "http://localhost:3000",
    logger: mockLogger,
  };
}

// Helper para requests POST com multipart/form-data
function makeRegisterRequest(fields: Record<string, string>): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: formData,
  });
}

// Helper para requests GET
function makeConfirmRequest(token: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/auth/confirm?token=${encodeURIComponent(token)}`,
    { method: "GET" },
  );
}

// Remove registros de teste desta suite (prefixo t54-)
async function cleanupT54(): Promise<void> {
  const t54Users = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, "t54-%@example.com"));

  for (const u of t54Users) {
    await db
      .delete(confirmationTokens)
      .where(eq(confirmationTokens.userId, u.id));
  }

  await db.delete(users).where(like(users.email, "t54-%@example.com"));
}

// Helper para inserir token de confirmacao diretamente no banco
async function insertToken(
  tokenId: string,
  userId: string,
  tokenValue: string,
  options?: { expiresAt?: Date; usedAt?: Date | null },
): Promise<void> {
  await db.insert(confirmationTokens).values({
    id: tokenId,
    userId,
    token: tokenValue,
    expiresAt: options?.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
    usedAt: options?.usedAt ?? null,
  });
}

describe("T-54: Verificação de emissão de logs estruturados JSON nos eventos críticos", () => {
  beforeAll(() => {
    setRegisterDeps(buildRegisterDepsWithMockLogger);
    setConfirmDeps(buildConfirmDepsWithMockLogger);
  });

  beforeEach(async () => {
    await cleanupT54();
    mockLogger.reset();
    registerRateLimiter.resetAll();
  });

  afterAll(async () => {
    await cleanupT54();
    resetRegisterDeps();
    resetConfirmDeps();
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  // -----------------------------------------------------------------------
  // NFR-6a — Log de criacao de cadastro com email mascarado e tipoEvento
  // -----------------------------------------------------------------------
  it("NFR-6a: emite log JSON com timestamp, requestId, email mascarado e tipoEvento na criação de cadastro", async () => {
    await POST(makeRegisterRequest({
      name: "T54 Usuario",
      email: "t54-log-create@example.com",
      password: "Senha@1234",
      passwordConfirmation: "Senha@1234",
      birthDate: "1990-01-01",
    } as Record<string, string>));

    // Localiza o log de criacao de cadastro
    const createLog = mockLogger.calls.find(
      (c) =>
        c.level === "info" &&
        (c.obj as Record<string, unknown>).tipoEvento === "cadastro_criado",
    );

    expect(createLog).toBeDefined();

    const obj = createLog!.obj as Record<string, unknown>;

    // Verifica campos obrigatorios (NFR-6)
    expect(obj.timestamp).toBeDefined();
    expect(typeof obj.timestamp).toBe("string");
    expect(obj.requestId).toBeDefined();
    expect(typeof obj.requestId).toBe("string");
    expect(obj.tipoEvento).toBe("cadastro_criado");

    // Verifica email mascarado — nao expoe endereco completo (NFR-6)
    expect(obj.email).toBeDefined();
    expect(typeof obj.email).toBe("string");
    const maskedEmail = obj.email as string;
    expect(maskedEmail).toContain("***@");
    // Nao deve conter o email completo
    expect(maskedEmail).not.toBe("t54-log-create@example.com");
  });

  // -----------------------------------------------------------------------
  // NFR-6b — Log de falha de envio de email com motivoFalha
  // -----------------------------------------------------------------------
  it("NFR-6b: emite log JSON com motivoFalha quando falha o envio de email", async () => {
    // Injeta email adapter que sempre falha para simular falha de SMTP
    const failingEmailDeps: RegisterHandlerDeps = {
      ...buildRegisterDepsWithMockLogger(),
      emailService: {
        send: async () => {
          throw new Error("SMTP connection refused");
        },
      },
    };
    setRegisterDeps(() => failingEmailDeps);

    await POST(makeRegisterRequest({
      name: "T54 Falha Email",
      email: "t54-email-fail@example.com",
      password: "Senha@1234",
      passwordConfirmation: "Senha@1234",
      birthDate: "1990-01-01",
    } as Record<string, string>));

    // Restaura deps com mock logger para proximos testes
    setRegisterDeps(buildRegisterDepsWithMockLogger);

    // Localiza o log de falha de email
    const failLog = mockLogger.calls.find(
      (c) =>
        c.level === "error" &&
        (c.obj as Record<string, unknown>).tipoEvento === "falha_envio_email",
    );

    expect(failLog).toBeDefined();

    const obj = failLog!.obj as Record<string, unknown>;

    // Verifica campos obrigatorios (NFR-6)
    expect(obj.timestamp).toBeDefined();
    expect(obj.requestId).toBeDefined();
    expect(obj.email).toBeDefined();
    expect(obj.tipoEvento).toBe("falha_envio_email");

    // Verifica campo motivoFalha — presente apenas em falha de email (NFR-6)
    expect(obj.motivoFalha).toBeDefined();
    expect(typeof obj.motivoFalha).toBe("string");
    expect(obj.motivoFalha).toContain("SMTP connection refused");
  });

  // -----------------------------------------------------------------------
  // NFR-7a — Log de confirmacao bem-sucedida com resultado e tokenId
  // -----------------------------------------------------------------------
  it("NFR-7a: emite log JSON com resultado 'confirmacao_sucedida', tokenId e requestId", async () => {
    const userId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const tokenValue = "t54aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".slice(0, 32);

    await db.insert(users).values({
      id: userId,
      name: "T54 Confirm OK",
      email: "t54-confirm-ok@example.com",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
      birthDate: new Date("1990-01-01"),
      status: "pending",
    });
    await insertToken(tokenId, userId, tokenValue);

    await GET(makeConfirmRequest(tokenValue));

    // Localiza o log de sucesso de confirmacao
    const successLog = mockLogger.calls.find(
      (c) =>
        c.level === "info" &&
        (c.obj as Record<string, unknown>).resultado === "confirmacao_sucedida",
    );

    expect(successLog).toBeDefined();

    const obj = successLog!.obj as Record<string, unknown>;

    // Verifica campos obrigatorios (NFR-7)
    expect(obj.timestamp).toBeDefined();
    expect(obj.resultado).toBe("confirmacao_sucedida");
    expect(obj.tokenId).toBeDefined();
    expect(obj.requestId).toBeDefined();

    // Verifica que tokenId e o UUID do token, nunca o valor do token (NFR-7)
    expect(obj.tokenId).toBe(tokenId);
    expect(obj.tokenId).not.toBe(tokenValue);
  });

  // -----------------------------------------------------------------------
  // NFR-7b — Log de link expirado com resultado e tokenId
  // -----------------------------------------------------------------------
  it("NFR-7b: emite log JSON com resultado 'link_expirado' e tokenId quando token expirado", async () => {
    const userId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const tokenValue = "t54bbbbbbbbbbbbbbbbbbbbbbbbbbbbbb".slice(0, 32);
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000); // -25h

    await db.insert(users).values({
      id: userId,
      name: "T54 Expired",
      email: "t54-expired@example.com",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
      birthDate: new Date("1990-01-01"),
      status: "pending",
    });
    await insertToken(tokenId, userId, tokenValue, { expiresAt: past });

    await GET(makeConfirmRequest(tokenValue));

    // Localiza o log de link expirado
    const expiredLog = mockLogger.calls.find(
      (c) =>
        c.level === "error" &&
        (c.obj as Record<string, unknown>).resultado === "link_expirado",
    );

    expect(expiredLog).toBeDefined();

    const obj = expiredLog!.obj as Record<string, unknown>;

    // Verifica campos obrigatorios (NFR-7)
    expect(obj.timestamp).toBeDefined();
    expect(obj.resultado).toBe("link_expirado");
    expect(obj.tokenId).toBe(tokenId);
    expect(obj.requestId).toBeDefined();

    // Verifica que tokenId nunca expoe o valor do token
    expect(obj.tokenId).not.toBe(tokenValue);
  });

  // -----------------------------------------------------------------------
  // NFR-7c — Log de link ja utilizado com resultado e tokenId
  // -----------------------------------------------------------------------
  it("NFR-7c: emite log JSON com resultado 'link_ja_utilizado' e tokenId quando token ja usado", async () => {
    const userId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();
    const tokenValue = "t54cccccccccccccccccccccccccccccc".slice(0, 32);
    const usedAt = new Date(Date.now() - 60 * 1000); // 1 minuto atras

    await db.insert(users).values({
      id: userId,
      name: "T54 Used Token",
      email: "t54-used-token@example.com",
      passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
      birthDate: new Date("1990-01-01"),
      status: "active",
    });
    await insertToken(tokenId, userId, tokenValue, {
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      usedAt,
    });

    await GET(makeConfirmRequest(tokenValue));

    // Localiza o log de link ja utilizado
    const usedLog = mockLogger.calls.find(
      (c) =>
        c.level === "error" &&
        (c.obj as Record<string, unknown>).resultado === "link_ja_utilizado",
    );

    expect(usedLog).toBeDefined();

    const obj = usedLog!.obj as Record<string, unknown>;

    // Verifica campos obrigatorios (NFR-7)
    expect(obj.timestamp).toBeDefined();
    expect(obj.resultado).toBe("link_ja_utilizado");
    expect(obj.tokenId).toBe(tokenId);
    expect(obj.requestId).toBeDefined();

    // Verifica que tokenId nunca expoe o valor do token
    expect(obj.tokenId).not.toBe(tokenValue);
  });
});

// Testes de segurança ST-7 — Prevenção de enumeração de usernames
// Rastreabilidade: REQ-7 · NFR-6 · DT-10 · T-82 · ST-7
//
// Verifica que o sistema não permite que um atacante determine se um username
// está cadastrado por diferença de mensagem de erro ou tempo de resposta.
//
// Casos cobertos:
//   (a) HTTP 409 para username duplicado retorna mensagem genérica sem revelar
//       dados do usuário existente (email, nome, status)
//   (b) O tempo de resposta para username duplicado não é significativamente
//       mais rápido que para username inédito com email já cadastrado
//   (c) Nenhum campo do usuário existente (email, nome, status) está presente
//       na resposta de erro 409 para username duplicado

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import {
  setDepsFactory,
  resetDepsFactory,
  type RegisterHandlerDeps,
} from "@/app/api/auth/register/deps";
import type { AvatarStoragePort } from "@/domain/ports/avatar-storage.port";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { TokenGenerator } from "@/domain/ports/token-generator";
import type { EmailService } from "@/domain/ports/email-service";
import type { ConfirmationTokenRepository } from "@/domain/ports/confirmation-token-repository";
import { User } from "@/domain/entities/user";
import { registerRateLimiter } from "@/adapters/inbound/http/rate-limiter";

// ---------------------------------------------------------------------------
// Mocks das dependências
// ---------------------------------------------------------------------------

const mockUserExistente = new User({
  id: "existing-user-id",
  name: "Usuario Existente",
  username: "usernameexistente",
  email: "existente@example.com",
  passwordHash: "$argon2id$real-hash-that-must-not-leak",
  birthDate: new Date("1985-05-15"),
  avatarKey: "avatars/existing-user.webp",
  status: "active",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
});

/** findByUsername retorna usuário existente para "usernameexistente", null para outros */
const mockFindByUsername = jest.fn<Promise<User | null>, [string]>();

/** findByEmail retorna usuário existente para "emailduplicado@example.com", null para outros */
const mockFindByEmail = jest.fn<Promise<User | null>, [string]>();

const mockUserRepository: UserRepository = {
  create: jest.fn(),
  findByUsername: mockFindByUsername,
  findByEmail: mockFindByEmail,
  findById: jest.fn().mockResolvedValue(null),
  delete: jest.fn(),
  activate: jest.fn(),
};

const mockAvatarStorage: AvatarStoragePort = {
  save: jest.fn().mockResolvedValue("avatars/mock-uuid.webp"),
};

const mockPasswordHasher: PasswordHasher = {
  hash: jest.fn().mockResolvedValue("$argon2id$mock-hash"),
};

const mockTokenGenerator: TokenGenerator = {
  generate: jest.fn().mockReturnValue("mock-token-32chars0000000000000000"),
};

const mockEmailService: EmailService = {
  send: jest.fn().mockResolvedValue(undefined),
};

const mockConfirmationTokenRepository: ConfirmationTokenRepository = {
  create: jest.fn().mockResolvedValue(undefined),
  findByToken: jest.fn().mockResolvedValue(null),
  markAsUsed: jest.fn().mockResolvedValue(undefined),
};

const testDeps: RegisterHandlerDeps = {
  userRepository: mockUserRepository,
  confirmationTokenRepository: mockConfirmationTokenRepository,
  passwordHasher: mockPasswordHasher,
  tokenGenerator: mockTokenGenerator,
  emailService: mockEmailService,
  avatarStorageAdapter: mockAvatarStorage,
  appBaseUrl: "http://localhost:3000",
  logger: { info: jest.fn(), error: jest.fn() },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFormDataRequest(fields: {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  passwordConfirmation?: string;
  birthDate?: string;
}): NextRequest {
  const formData = new FormData();
  const defaults = {
    name: "Teste ST7",
    username: "usernametest",
    email: "st7test@example.com",
    password: "Senha@1234",
    passwordConfirmation: "Senha@1234",
    birthDate: "1990-01-01",
  };
  const merged = { ...defaults, ...fields };
  for (const [key, value] of Object.entries(merged)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: formData,
  });
}

/**
 * Mede o tempo de uma chamada ao endpoint em milissegundos.
 * Retorna { status, json, durationMs }.
 */
async function timedPost(request: NextRequest): Promise<{
  status: number;
  json: unknown;
  durationMs: number;
}> {
  const start = performance.now();
  const response = await POST(request);
  const durationMs = performance.now() - start;
  const json = await response.json();
  return { status: response.status, json, durationMs };
}

// ---------------------------------------------------------------------------
// Suite de testes
// ---------------------------------------------------------------------------

describe("ST-7: Prevenção de enumeração de usernames (segurança)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerRateLimiter.resetAll();
    setDepsFactory(() => testDeps);

    // Configuração padrão dos mocks:
    // - "usernameexistente" está cadastrado
    // - "emailduplicado@example.com" está cadastrado
    // - qualquer outro username/email retorna null
    mockFindByUsername.mockImplementation(async (username: string) => {
      if (username === "usernameexistente") return mockUserExistente;
      return null;
    });
    mockFindByEmail.mockImplementation(async (email: string) => {
      if (email === "emailduplicado@example.com") return mockUserExistente;
      return null;
    });
  });

  afterEach(() => {
    resetDepsFactory();
  });

  // -------------------------------------------------------------------------
  // ST-7a — Resposta 409 para username duplicado não revela dados do usuário
  // -------------------------------------------------------------------------
  it("(a) HTTP 409 para username duplicado retorna mensagem genérica sem revelar dados do usuário existente", async () => {
    const request = makeFormDataRequest({
      username: "usernameexistente",
      email: "st7-novoemail@example.com",
    });

    const response = await POST(request);
    expect(response.status).toBe(409);

    const json = await response.json() as Record<string, unknown>;

    // Mensagem genérica conforme especificado no ST-7
    expect(json.mensagem).toBe("Este username ja esta cadastrado. Escolha outro.");

    // Estrutura padronizada presente (constitution.md, regra 5)
    expect(json.codigo).toBe(409);
    expect(typeof json.requestId).toBe("string");
    expect(typeof json.timestamp).toBe("string");

    // Campos do usuário existente NÃO devem estar na resposta
    const responseStr = JSON.stringify(json);
    expect(responseStr).not.toContain(mockUserExistente.email);
    expect(responseStr).not.toContain(mockUserExistente.name);
    expect(responseStr).not.toContain(mockUserExistente.status);
    expect(responseStr).not.toContain(mockUserExistente.id);
    expect(responseStr).not.toContain(mockUserExistente.passwordHash);
    expect(responseStr).not.toContain(mockUserExistente.avatarKey);
  });

  // -------------------------------------------------------------------------
  // ST-7b — Diferença de tempo entre os dois 409 não permite inferência
  // -------------------------------------------------------------------------
  it("(b) diferença de tempo entre username duplicado e email duplicado não revela resultado por timing attack", async () => {
    // Aquecimento — descartado da medição
    await POST(makeFormDataRequest({ username: "usernameexistente", email: "warmup1@example.com" }));
    await POST(makeFormDataRequest({ username: "usernamenovo", email: "emailduplicado@example.com" }));

    // Caso A: username duplicado → 409 imediato (findByUsername retorna existente)
    const AMOSTRAS = 5;
    const temposUsernameDuplicado: number[] = [];
    const temposEmailDuplicado: number[] = [];

    for (let i = 0; i < AMOSTRAS; i++) {
      const { durationMs: durUsernamedup } = await timedPost(
        makeFormDataRequest({
          username: "usernameexistente",
          email: `st7b-novo-${i}@example.com`,
        }),
      );
      temposUsernameDuplicado.push(durUsernamedup);

      const { durationMs: durEmaildup } = await timedPost(
        makeFormDataRequest({
          username: `st7b-novousername-${i}`,
          email: "emailduplicado@example.com",
        }),
      );
      temposEmailDuplicado.push(durEmaildup);
    }

    const mediaUsernameDuplicado =
      temposUsernameDuplicado.reduce((a, b) => a + b, 0) / AMOSTRAS;
    const mediaEmailDuplicado =
      temposEmailDuplicado.reduce((a, b) => a + b, 0) / AMOSTRAS;

    const diferencaAbsolutaMs = Math.abs(mediaUsernameDuplicado - mediaEmailDuplicado);

    // Tolerância: diferença de até 200ms é aceitável em ambiente de testes com mocks.
    // O teste verifica que o sistema não retorna ordens de magnitude mais rápido
    // para um caso vs. o outro — prevenindo inferência básica por timing.
    //
    // Nota: com mocks síncronos ambos os casos são igualmente rápidos.
    // O threshold de 200ms garante que, mesmo com variação de ambiente,
    // não haja uma discrepância que permita inferência determinística.
    const THRESHOLD_MS = 200;

    expect(diferencaAbsolutaMs).toBeLessThan(THRESHOLD_MS);
  });

  // -------------------------------------------------------------------------
  // ST-7c — Nenhum campo do usuário existente na resposta de erro 409
  // -------------------------------------------------------------------------
  it("(c) nenhum campo do usuário existente está na resposta de erro 409 para username duplicado", async () => {
    const request = makeFormDataRequest({
      username: "usernameexistente",
      email: "st7c-novo@example.com",
    });

    const response = await POST(request);
    expect(response.status).toBe(409);

    const json = await response.json() as Record<string, unknown>;

    // Verifica que apenas os campos padronizados estão presentes
    const camposPresentes = Object.keys(json);
    expect(camposPresentes.sort()).toEqual(
      ["codigo", "mensagem", "requestId", "timestamp"].sort(),
    );

    // Garante que nenhum campo extra (dados do usuário existente) vazou
    expect(camposPresentes).not.toContain("email");
    expect(camposPresentes).not.toContain("nome");
    expect(camposPresentes).not.toContain("name");
    expect(camposPresentes).not.toContain("status");
    expect(camposPresentes).not.toContain("id");
    expect(camposPresentes).not.toContain("username");
    expect(camposPresentes).not.toContain("avatarKey");
    expect(camposPresentes).not.toContain("passwordHash");

    // Garante que o body não contém os valores dos dados do usuário existente
    const responseStr = JSON.stringify(json);
    expect(responseStr).not.toContain("existente@example.com");
    expect(responseStr).not.toContain("Usuario Existente");
    expect(responseStr).not.toContain("active");
    expect(responseStr).not.toContain("existing-user-id");
  });
});

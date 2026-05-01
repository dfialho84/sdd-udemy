// Teste de integração IT-6 — RegisterUserHandler POST /api/auth/register
// Testa o endpoint completo com banco MySQL real e Mailhog real.
// Rastreabilidade: T-21 · IT-6 · REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7 · REQ-8 · REQ-9 · NFR-4 · DT-6
//
// Pré-requisitos:
//   - banco MySQL de teste rodando com migration aplicada (kanban_mysql)
//   - Mailhog rodando via Docker Compose (kanban_mailhog)
//   - DATABASE_URL apontando para o banco de teste
//
// O adapter de armazenamento de avatar é mockado neste teste para isolar o banco e email.
// A verificação com MinIO real é coberta por IT-5 (T-64).

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import { setDepsFactory, resetDepsFactory, buildUseCaseDeps } from "@/app/api/auth/register/deps";
import type { AvatarStoragePort } from "@/domain/ports/avatar-storage.port";
import { registerRateLimiter } from "@/adapters/inbound/http/rate-limiter";
import { db } from "@/lib/db";
import { users, confirmationTokens } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";
import { randomUUID } from "crypto";

/** Mock do AvatarStoragePort — retorna object key no formato MinIO sem instância real */
class MockAvatarStorageAdapter implements AvatarStoragePort {
  async save(_buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType === "image/jpeg" ? ".jpg"
      : mimeType === "image/png" ? ".png"
      : mimeType === "image/webp" ? ".webp"
      : ".bin";
    return `avatars/${randomUUID()}${ext}`;
  }
}

/** Monta uma NextRequest com multipart/form-data (somente campos de texto) */
function makeFormRequest(
  fields: Record<string, string>,
  headers: Record<string, string> = {},
): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers,
    body: formData,
  });
}

/** Monta uma NextRequest com multipart/form-data incluindo arquivo de avatar */
function makeFormRequestWithAvatar(
  fields: Record<string, string>,
  avatarContent: Uint8Array | string,
  avatarType: string,
  avatarFilename: string = "avatar.jpg",
  headers: Record<string, string> = {},
): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  const file = new File([avatarContent], avatarFilename, { type: avatarType });
  formData.append("avatar", file);

  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers,
    body: formData,
  });
}

const validFields = {
  name: "Integração Teste",
  username: "it6testuser",
  email: "it6-valid@example.com",
  password: "Senha@1234",
  passwordConfirmation: "Senha@1234",
  birthDate: "1990-06-15",
};

// Limpa o banco antes e depois da suíte
async function cleanupTestUsers() {
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, "it6-%@example.com"));

  for (const u of testUsers) {
    await db
      .delete(confirmationTokens)
      .where(eq(confirmationTokens.userId, u.id));
  }

  await db.delete(users).where(like(users.email, "it6-%@example.com"));
}

describe("IT-6: RegisterUserHandler — POST /api/auth/register (integração)", () => {
  beforeAll(() => {
    jest.setTimeout(30_000);
    // Injetar dependências concretas com mock do adapter de avatar (sem MinIO real).
    // A verificação com MinIO real é coberta por IT-5 (T-64).
    setDepsFactory(() => ({
      ...buildUseCaseDeps(),
      avatarStorageAdapter: new MockAvatarStorageAdapter(),
    }));
  });

  beforeEach(async () => {
    await cleanupTestUsers();
    registerRateLimiter.resetAll();
  });

  afterAll(async () => {
    await cleanupTestUsers();
    resetDepsFactory();

    // Encerra o pool de conexões para o Jest não ficar aguardando handles abertos
    await (db.$client as { end?: () => Promise<void> }).end?.();
  });

  // -----------------------------------------------------------------------
  // Caminho feliz sem avatar: HTTP 200, usuário pending, avatar_url = null
  // -----------------------------------------------------------------------
  describe("HTTP 200 — dados válidos sem avatar (REQ-1 · REQ-8 · REQ-9)", () => {
    it("retorna 200 com mensagem de link enviado", async () => {
      const response = await POST(makeFormRequest(validFields));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toBe("Um link de confirmacao foi enviado ao seu email.");
    });

    it("persiste o usuário com status 'pending' e avatar_key = null no banco", async () => {
      await POST(makeFormRequest(validFields));

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, validFields.email));

      expect(rows).toHaveLength(1);
      expect(rows[0]!.status).toBe("pending");
      expect(rows[0]!.avatarKey).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Caminho feliz com avatar JPEG válido: HTTP 200, objeto gravado no MinIO, avatar_key preenchida
  // -----------------------------------------------------------------------
  describe("HTTP 200 — dados válidos com avatar JPEG válido ≤ 2 MB (REQ-2 · DT-6)", () => {
    it("retorna 200 e persiste avatar_key com object key do MinIO no banco", async () => {
      const fakeJpeg = Buffer.from("fake-jpeg-data");

      const response = await POST(
        makeFormRequestWithAvatar(
          { ...validFields, email: "it6-avatar@example.com" },
          fakeJpeg,
          "image/jpeg",
          "photo.jpg",
        ),
      );

      expect(response.status).toBe(200);

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, "it6-avatar@example.com"));

      expect(rows).toHaveLength(1);
      // avatar_key deve ser a object key retornada pelo adapter de armazenamento
      expect(rows[0]!.avatarKey).toBeDefined();
      expect(rows[0]!.avatarKey).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — avatar com tipo MIME não permitido (ST-4)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — avatar com tipo MIME não permitido (ST-4 · REQ-2)", () => {
    it("retorna 400 e não cria registro quando MIME é image/gif", async () => {
      const response = await POST(
        makeFormRequestWithAvatar(
          { ...validFields, email: "it6-badmime@example.com" },
          Buffer.from("fake-gif-data"),
          "image/gif",
          "image.gif",
        ),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);

      // Nenhum registro criado
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, "it6-badmime@example.com"));
      expect(rows).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — avatar acima de 2 MB
  // -----------------------------------------------------------------------
  describe("HTTP 400 — avatar acima de 2 MB (REQ-2)", () => {
    it("retorna 400 e não cria registro quando tamanho excede 2 MB", async () => {
      const oversizedContent = new Uint8Array(2 * 1024 * 1024 + 1).fill(0xff);

      const response = await POST(
        makeFormRequestWithAvatar(
          { ...validFields, email: "it6-bigfile@example.com" },
          oversizedContent,
          "image/jpeg",
          "bigfile.jpg",
        ),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);

      // Nenhum registro criado
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, "it6-bigfile@example.com"));
      expect(rows).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — campos obrigatórios ausentes (REQ-2)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — campo obrigatório ausente (REQ-2 · REQ-7)", () => {
    const missingFieldCases: Array<[string, Partial<typeof validFields>, RegExp]> = [
      ["name ausente", { username: "it6erruser", email: "it6-err@example.com", password: "Senha@1234", passwordConfirmation: "Senha@1234", birthDate: "1990-01-01" }, /nome/i],
      ["username ausente", { name: "Teste", email: "it6-err@example.com", password: "Senha@1234", passwordConfirmation: "Senha@1234", birthDate: "1990-01-01" }, /username/i],
      ["email ausente", { name: "Teste", username: "it6erruser2", password: "Senha@1234", passwordConfirmation: "Senha@1234", birthDate: "1990-01-01" }, /email/i],
      ["password ausente", { name: "Teste", username: "it6erruser3", email: "it6-err@example.com", passwordConfirmation: "Senha@1234", birthDate: "1990-01-01" }, /senha/i],
      ["birthDate ausente", { name: "Teste", username: "it6erruser4", email: "it6-err@example.com", password: "Senha@1234", passwordConfirmation: "Senha@1234" }, /nascimento/i],
    ];

    it.each(missingFieldCases)(
      "retorna 400 quando %s",
      async (_label, fields, errorPattern) => {
        const response = await POST(makeFormRequest(fields as Record<string, string>));

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.codigo).toBe(400);
        expect(json.mensagem).toMatch(errorPattern);
        expect(json.requestId).toBeDefined();
        expect(json.timestamp).toBeDefined();
      },
    );

    it("não cria nenhum registro no banco quando campo obrigatório está ausente", async () => {
      await POST(
        makeFormRequest({
          email: "it6-no-record@example.com",
          password: "Senha@1234",
          passwordConfirmation: "Senha@1234",
          birthDate: "1990-01-01",
        }),
      );

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, "it6-no-record@example.com"));

      expect(rows).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — email com formato inválido (REQ-6)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — email com formato inválido (REQ-6 · REQ-7)", () => {
    it("retorna 400 com mensagem exata", async () => {
      const response = await POST(
        makeFormRequest({ ...validFields, email: "email-invalido" }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBe("Informe um endereço de email válido.");
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — senha fora da política (REQ-4)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — senha fora da política (REQ-4 · REQ-7)", () => {
    it("retorna 400 com mensagem exata quando senha não atende a política", async () => {
      const response = await POST(
        makeFormRequest({
          ...validFields,
          email: "it6-weakpwd@example.com",
          password: "fraca",
          passwordConfirmation: "fraca",
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBe(
        "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.",
      );
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — senhas divergentes (REQ-5)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — senhas divergentes (REQ-5 · REQ-7)", () => {
    it("retorna 400 com mensagem exata quando senhas não coincidem", async () => {
      const response = await POST(
        makeFormRequest({
          ...validFields,
          email: "it6-mismatch@example.com",
          passwordConfirmation: "OutraSenha@1234",
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBe("As senhas não coincidem.");
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 409 — email duplicado (REQ-3)
  // -----------------------------------------------------------------------
  describe("HTTP 409 — email duplicado (REQ-3 · REQ-7)", () => {
    it("retorna 409 com mensagem específica na segunda tentativa com o mesmo email", async () => {
      const first = await POST(makeFormRequest(validFields));
      expect(first.status).toBe(200);

      const second = await POST(makeFormRequest(validFields));

      expect(second.status).toBe(409);
      const json = await second.json();
      expect(json.codigo).toBe(409);
      expect(json.mensagem).toBe(
        "Este email já está cadastrado. Tente fazer login ou use outro endereço.",
      );
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 429 — rate limit excedido (NFR-4)
  // -----------------------------------------------------------------------
  describe("HTTP 429 — quarta tentativa do mesmo IP em 15 min (NFR-4 · REQ-7)", () => {
    it("retorna 429 na quarta tentativa do mesmo IP", async () => {
      const ipHeader = { "x-forwarded-for": "192.168.99.1" };

      const emails = [
        "it6-rl-1@example.com",
        "it6-rl-2@example.com",
        "it6-rl-3@example.com",
      ];

      for (const email of emails) {
        const res = await POST(makeFormRequest({ ...validFields, email }, ipHeader));
        expect(res.status).not.toBe(429);
      }

      const fourth = await POST(
        makeFormRequest({ ...validFields, email: "it6-rl-4@example.com" }, ipHeader),
      );

      expect(fourth.status).toBe(429);
      const json = await fourth.json();
      expect(json).toMatchObject({
        codigo: 429,
        mensagem: expect.any(String),
        requestId: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});

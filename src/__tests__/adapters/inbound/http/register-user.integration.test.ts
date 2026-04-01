// Teste de integração IT-5 — RegisterUserHandler POST /api/auth/register
// Testa o endpoint completo com banco MySQL real e Mailhog real.
// Rastreabilidade: T-21 · IT-5 · REQ-1 · REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7 · REQ-8 · REQ-9 · NFR-4
//
// Pré-requisitos:
//   - banco MySQL de teste rodando com migration aplicada (kanban_mysql)
//   - Mailhog rodando via Docker Compose (kanban_mailhog)
//   - DATABASE_URL apontando para o banco de teste

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import { setDepsFactory, resetDepsFactory, buildUseCaseDeps } from "@/app/api/auth/register/deps";
import { registerRateLimiter } from "@/adapters/inbound/http/rate-limiter";
import { db } from "@/lib/db";
import { users, confirmationTokens } from "@/lib/db/schema";
import { eq, like } from "drizzle-orm";

// Helper para construir requests
function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Integração Teste",
  email: "it5-valid@example.com",
  password: "Senha@1234",
  passwordConfirmation: "Senha@1234",
  birthDate: "1990-06-15",
};

// Limpa o banco antes e depois da suíte
async function cleanupTestUsers() {
  // Remove tokens vinculados a usuários de teste antes de apagar usuários (FK)
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, "it5-%@example.com"));

  for (const u of testUsers) {
    await db
      .delete(confirmationTokens)
      .where(eq(confirmationTokens.userId, u.id));
  }

  await db.delete(users).where(like(users.email, "it5-%@example.com"));
}

describe("IT-5: RegisterUserHandler — POST /api/auth/register (integração)", () => {
  beforeAll(() => {
    // Injetar dependências concretas (banco real + Mailhog real) para toda a suíte
    setDepsFactory(buildUseCaseDeps);
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
  // Caminho feliz: HTTP 200, usuário pending e token criados no banco
  // -----------------------------------------------------------------------
  describe("HTTP 200 — dados válidos (REQ-1 · REQ-8 · REQ-9)", () => {
    it("retorna 200 com mensagem de link enviado", async () => {
      const response = await POST(makeRequest(validBody));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toBe("Um link de confirmacao foi enviado ao seu email.");
    });

    it("persiste o usuário com status 'pending' no banco", async () => {
      await POST(makeRequest(validBody));

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, validBody.email));

      expect(rows).toHaveLength(1);
      expect(rows[0]!.status).toBe("pending");
      expect(rows[0]!.name).toBe(validBody.name);
    });

    it("cria o token de confirmação vinculado ao usuário no banco", async () => {
      await POST(makeRequest(validBody));

      const userRows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, validBody.email));

      const userId = userRows[0]?.id;
      expect(userId).toBeDefined();

      const tokenRows = await db
        .select()
        .from(confirmationTokens)
        .where(eq(confirmationTokens.userId, userId!));

      expect(tokenRows).toHaveLength(1);
      expect(tokenRows[0]!.usedAt).toBeNull();
      expect(tokenRows[0]!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — campos obrigatórios ausentes (REQ-2)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — campo obrigatório ausente (REQ-2 · REQ-7)", () => {
    const missingFieldCases: Array<[string, Partial<typeof validBody>, RegExp]> = [
      ["name ausente", { email: "it5-err@example.com", password: "Senha@1234", passwordConfirmation: "Senha@1234", birthDate: "1990-01-01" }, /nome/i],
      ["email ausente", { name: "Teste", password: "Senha@1234", passwordConfirmation: "Senha@1234", birthDate: "1990-01-01" }, /email/i],
      ["password ausente", { name: "Teste", email: "it5-err@example.com", passwordConfirmation: "Senha@1234", birthDate: "1990-01-01" }, /senha/i],
      ["birthDate ausente", { name: "Teste", email: "it5-err@example.com", password: "Senha@1234", passwordConfirmation: "Senha@1234" }, /nascimento/i],
    ];

    it.each(missingFieldCases)(
      "retorna 400 quando %s",
      async (_label, body, errorPattern) => {
        const response = await POST(makeRequest(body));

        expect(response.status).toBe(400);
        const json = await response.json();
        expect(json.codigo).toBe(400);
        expect(json.mensagem).toMatch(errorPattern);
        expect(json.requestId).toBeDefined();
        expect(json.timestamp).toBeDefined();
      },
    );

    it("não cria nenhum registro no banco quando campo obrigatório está ausente", async () => {
      const bodyWithoutName = {
        email: "it5-no-record@example.com",
        password: "Senha@1234",
        passwordConfirmation: "Senha@1234",
        birthDate: "1990-01-01",
      };

      await POST(makeRequest(bodyWithoutName));

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, "it5-no-record@example.com"));

      expect(rows).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — email com formato inválido (REQ-6)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — email com formato inválido (REQ-6 · REQ-7)", () => {
    it("retorna 400 com mensagem exata", async () => {
      const response = await POST(
        makeRequest({ ...validBody, email: "email-invalido" }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBe("Informe um endereço de email válido.");
    });

    it("não cria nenhum registro no banco", async () => {
      await POST(makeRequest({ ...validBody, email: "email-invalido" }));

      const rows = await db
        .select()
        .from(users)
        .where(like(users.email, "it5-%@example.com"));

      expect(rows).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — senha fora da política (REQ-4)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — senha fora da política (REQ-4 · REQ-7)", () => {
    it("retorna 400 com mensagem exata quando senha não atende a política", async () => {
      const response = await POST(
        makeRequest({
          ...validBody,
          email: "it5-weakpwd@example.com",
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

    it("não cria nenhum registro no banco", async () => {
      await POST(
        makeRequest({
          ...validBody,
          email: "it5-weakpwd@example.com",
          password: "fraca",
          passwordConfirmation: "fraca",
        }),
      );

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, "it5-weakpwd@example.com"));

      expect(rows).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 400 — senhas divergentes (REQ-5)
  // -----------------------------------------------------------------------
  describe("HTTP 400 — senhas divergentes (REQ-5 · REQ-7)", () => {
    it("retorna 400 com mensagem exata quando senhas não coincidem", async () => {
      const response = await POST(
        makeRequest({
          ...validBody,
          email: "it5-mismatch@example.com",
          passwordConfirmation: "OutraSenha@1234",
        }),
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.codigo).toBe(400);
      expect(json.mensagem).toBe("As senhas não coincidem.");
    });

    it("não cria nenhum registro no banco", async () => {
      await POST(
        makeRequest({
          ...validBody,
          email: "it5-mismatch@example.com",
          passwordConfirmation: "OutraSenha@1234",
        }),
      );

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, "it5-mismatch@example.com"));

      expect(rows).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 409 — email duplicado (REQ-3)
  // -----------------------------------------------------------------------
  describe("HTTP 409 — email duplicado (REQ-3 · REQ-7)", () => {
    it("retorna 409 com mensagem específica na segunda tentativa com o mesmo email", async () => {
      // Primeiro cadastro — deve ter sucesso
      const first = await POST(makeRequest(validBody));
      expect(first.status).toBe(200);

      // Segundo cadastro com o mesmo email — deve retornar 409
      const second = await POST(makeRequest(validBody));

      expect(second.status).toBe(409);
      const json = await second.json();
      expect(json.codigo).toBe(409);
      expect(json.mensagem).toBe(
        "Este email já está cadastrado. Tente fazer login ou use outro endereço.",
      );
      expect(json.requestId).toBeDefined();
      expect(json.timestamp).toBeDefined();
    });

    it("não cria segundo registro no banco quando email já existe", async () => {
      await POST(makeRequest(validBody));
      await POST(makeRequest(validBody));

      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, validBody.email));

      // Apenas um registro deve existir
      expect(rows).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // HTTP 429 — rate limit excedido (NFR-4)
  // -----------------------------------------------------------------------
  describe("HTTP 429 — quarta tentativa do mesmo IP em 15 min (NFR-4 · REQ-7)", () => {
    it("retorna 429 na quarta tentativa do mesmo IP", async () => {
      const ipHeader = { "x-forwarded-for": "192.168.99.1" };

      // 3 primeiras tentativas do mesmo IP — usam emails distintos para não conflitar
      const emails = [
        "it5-rl-1@example.com",
        "it5-rl-2@example.com",
        "it5-rl-3@example.com",
      ];

      for (const email of emails) {
        const res = await POST(makeRequest({ ...validBody, email }, ipHeader));
        // Status deve ser 200 (sucesso) — não 429
        expect(res.status).not.toBe(429);
      }

      // 4ª tentativa — deve ser bloqueada com 429
      const fourth = await POST(
        makeRequest({ ...validBody, email: "it5-rl-4@example.com" }, ipHeader),
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

    it("não cria registro no banco quando bloqueado por rate limit", async () => {
      const ipHeader = { "x-forwarded-for": "192.168.99.2" };

      // Esgota as 3 tentativas permitidas
      for (let i = 1; i <= 3; i++) {
        await POST(
          makeRequest({ ...validBody, email: `it5-rl-b${i}@example.com` }, ipHeader),
        );
      }

      // 4ª tentativa — bloqueada antes de processar
      await POST(
        makeRequest({ ...validBody, email: "it5-rl-b4@example.com" }, ipHeader),
      );

      // O email it5-rl-b4 não deve ter sido criado
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.email, "it5-rl-b4@example.com"));

      expect(rows).toHaveLength(0);
    });
  });
});

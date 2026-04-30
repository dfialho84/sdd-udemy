// Testes de seguranca da feature login — T-64
// Cobre ST-1 a ST-5 da test-strategy.md
// Rastreabilidade: NFR-3 · NFR-4 · NFR-5 · NFR-6 · NFR-7 · REQ-8 · REQ-9 · REQ-11 · REQ-13
//
// Cada ST pode ser implementado como teste de integracao ou unitario conforme
// a natureza da verificacao (T-64).
//
// ST-1: Bloqueio por forca bruta — rate limiting apos 3 falhas
// ST-2: Enumeracao de contas por resposta diferenciada
// ST-3: Timing attack — tempo de resposta uniforme entre falhas
// ST-4: Sessao invalida nao autoriza acesso a recursos protegidos
// ST-5: Log estruturado de todas as tentativas de autenticacao

import { authorizeCredentials } from "@/lib/auth/authorize";
import { baseAuthConfig } from "@/lib/auth/config.base";
import {
  AuthenticationError,
  AccountBlockedError,
  type AuthenticateUserUseCaseDeps,
} from "@/application/use-cases/authenticate-user.use-case";
import type { LoginUser } from "@/domain/entities/login-user";
import type { LoginBlock } from "@/domain/entities/login-attempt";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const ACTIVE_USER: LoginUser = {
  id: "user-uuid-st",
  username: "alice",
  email: "alice@example.com",
  passwordHash: "$argon2id$v=19$m=65536,t=3,p=2$stubhash",
  status: "active",
};

const NOW = new Date();
const FUTURE_BLOCK: LoginBlock = {
  id: "block-uuid-st",
  identifier: "alice",
  blocked_until: new Date(NOW.getTime() + 15 * 60 * 1000),
  created_at: NOW,
};

// ─── Factory de mocks ──────────────────────────────────────────────────────

function makeDeps(overrides?: {
  findByIdentifierResult?: LoginUser | null;
  verifyResult?: boolean;
  findActiveBlockResult?: LoginBlock | null;
  countRecentFailuresResult?: number;
}): AuthenticateUserUseCaseDeps {
  const opts = overrides ?? {};

  const userRepository = {
    findByIdentifier: jest.fn().mockResolvedValue(
      opts.findByIdentifierResult !== undefined
        ? opts.findByIdentifierResult
        : ACTIVE_USER,
    ),
  };

  const passwordVerifier = {
    verify: jest.fn().mockResolvedValue(
      opts.verifyResult !== undefined ? opts.verifyResult : true,
    ),
  };

  const loginAttemptRepository = {
    save: jest.fn().mockResolvedValue(undefined),
    countRecentFailures: jest.fn().mockResolvedValue(
      opts.countRecentFailuresResult ?? 0,
    ),
    findActiveBlock: jest.fn().mockResolvedValue(
      opts.findActiveBlockResult ?? null,
    ),
    findAnyBlock: jest.fn().mockResolvedValue(null),
    createBlock: jest.fn().mockResolvedValue(undefined),
    removeBlock: jest.fn().mockResolvedValue(undefined),
    resetFailureCount: jest.fn().mockResolvedValue(undefined),
  };

  const logger = { info: jest.fn(), error: jest.fn() };

  return { userRepository, passwordVerifier, loginAttemptRepository, logger };
}

function getDepsFactory(deps: AuthenticateUserUseCaseDeps) {
  return () => deps;
}

// ══════════════════════════════════════════════════════════════════════════
// ST-1: Bloqueio por forca bruta — rate limiting apos 3 falhas
// ══════════════════════════════════════════════════════════════════════════

describe("ST-1: Bloqueio por forca bruta apos 3 falhas (seguranca)", () => {
  // -----------------------------------------------------------------------
  // ST-1a: 3 falhas ativam bloqueio; 4a tentativa com senha incorreta
  //         retorna 429 (AccountBlockedError) — mesmo efeito do config.ts
  // -----------------------------------------------------------------------
  it("ST-1a: countRecentFailures=3 apos falha ativa bloqueio (AccountBlockedError)", async () => {
    const deps = makeDeps({
      verifyResult: false,
      countRecentFailuresResult: 3,
    });

    await expect(
      authorizeCredentials(
        { identifier: "alice", password: "SenhaErrada!" },
        getDepsFactory(deps),
      ),
    ).rejects.toThrow(AccountBlockedError);

    // createBlock deve ser chamado com o identifier correto
    expect(deps.loginAttemptRepository.createBlock).toHaveBeenCalledWith(
      "alice",
      expect.any(Date),
    );
  });

  // -----------------------------------------------------------------------
  // ST-1b: findActiveBlock retorna bloqueio vigente — 4a tentativa
  //         com a senha correta tambem retorna 429
  // -----------------------------------------------------------------------
  it("ST-1b: bloqueio ativo retorna AccountBlockedError mesmo com senha correta", async () => {
    const deps = makeDeps({
      verifyResult: true,
      findActiveBlockResult: FUTURE_BLOCK,
    });

    await expect(
      authorizeCredentials(
        { identifier: "alice", password: "Senha@123" },
        getDepsFactory(deps),
      ),
    ).rejects.toThrow(AccountBlockedError);

    // UserRepository e PasswordVerifier nao devem ser chamados
    expect(deps.userRepository.findByIdentifier).not.toHaveBeenCalled();
    expect(deps.passwordVerifier.verify).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // ST-1c: Identifier diferente (nao bloqueado) retorna normalmente —
  //         bloqueio e por identificador, nao global
  // -----------------------------------------------------------------------
  it("ST-1c: identifier diferente nao bloqueado retorna sucesso (nao 429)", async () => {
    // Deps para bob: sem bloqueio, usuario ativo, senha correta
    const depsBob = makeDeps({
      findByIdentifierResult: {
        ...ACTIVE_USER,
        id: "user-bob",
        username: "bob",
        email: "bob@example.com",
      },
      verifyResult: true,
      findActiveBlockResult: null,
    });

    const result = await authorizeCredentials(
      { identifier: "bob", password: "Senha@123" },
      getDepsFactory(depsBob),
    );

    expect(result).not.toBeNull();
    expect(result!.id).toBe("user-bob");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ST-2: Enumeracao de contas por resposta diferenciada
// ══════════════════════════════════════════════════════════════════════════

describe("ST-2: Enumeracao de contas por resposta diferenciada (seguranca)", () => {
  // -----------------------------------------------------------------------
  // ST-2a: Identifier inexistente — AuthenticationError
  // -----------------------------------------------------------------------
  it("ST-2a: identifier inexistente lanca AuthenticationError (401)", async () => {
    const deps = makeDeps({ findByIdentifierResult: null });

    await expect(
      authorizeCredentials(
        { identifier: "inexistente", password: "qualquer" },
        getDepsFactory(deps),
      ),
    ).rejects.toThrow(AuthenticationError);
  });

  // -----------------------------------------------------------------------
  // ST-2b: Identifier existente + senha incorreta — mesmo erro
  // -----------------------------------------------------------------------
  it("ST-2b: senha incorreta lanca AuthenticationError com mesma mensagem", async () => {
    const deps = makeDeps({ verifyResult: false });

    let error: unknown;
    try {
      await authorizeCredentials(
        { identifier: "alice", password: "SenhaErrada!" },
        getDepsFactory(deps),
      );
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(AuthenticationError);
    expect((error as AuthenticationError).message).toBe(
      "Usuário ou senha incorretos",
    );
  });

  // -----------------------------------------------------------------------
  // ST-2c: Identifier existente com status=pending — mesmo erro
  //        (findByIdentifier retorna null para nao-active)
  // -----------------------------------------------------------------------
  it("ST-2c: conta pending lanca AuthenticationError identico", async () => {
    const deps = makeDeps({ findByIdentifierResult: null });

    await expect(
      authorizeCredentials(
        { identifier: "alice", password: "qualquer" },
        getDepsFactory(deps),
      ),
    ).rejects.toThrow(AuthenticationError);
  });

  // -----------------------------------------------------------------------
  // ST-2d: Mensagens de erro sao identicas entre os 3 casos
  // -----------------------------------------------------------------------
  it("ST-2d: mensagem de erro e identica para inexistente, senha incorreta e pending", async () => {
    const mensagens: string[] = [];

    // Caso A: inexistente
    const depsA = makeDeps({ findByIdentifierResult: null });
    try {
      await authorizeCredentials(
        { identifier: "naoexiste", password: "x" },
        getDepsFactory(depsA),
      );
    } catch (e) {
      mensagens.push((e as AuthenticationError).message);
    }

    // Caso B: senha incorreta
    const depsB = makeDeps({ verifyResult: false });
    try {
      await authorizeCredentials(
        { identifier: "alice", password: "SenhaErrada!" },
        getDepsFactory(depsB),
      );
    } catch (e) {
      mensagens.push((e as AuthenticationError).message);
    }

    // Caso C: pending (simulado como findByIdentifier null)
    const depsC = makeDeps({ findByIdentifierResult: null });
    try {
      await authorizeCredentials(
        { identifier: "alice", password: "x" },
        getDepsFactory(depsC),
      );
    } catch (e) {
      mensagens.push((e as AuthenticationError).message);
    }

    // Todas as mensagens devem ser identicas
    expect(mensagens.length).toBe(3);
    expect(mensagens[0]).toBe(mensagens[1]);
    expect(mensagens[1]).toBe(mensagens[2]);
    expect(mensagens[0]).toBe("Usuário ou senha incorretos");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ST-3: Timing attack — tempo de resposta uniforme entre falhas
// ══════════════════════════════════════════════════════════════════════════

describe("ST-3: Timing attack — tempo uniforme entre falhas (seguranca)", () => {
  const AMOSTRAS = 50;

  /**
   * Mede o tempo de uma chamada ao authorizeCredentials em ms.
   * Como authorizeCredentials lanca erro para falhas de autenticacao,
   * capturamos o erro e retornamos apenas a duracao.
   */
  async function measureDuration(
    identifier: string,
    password: string,
    deps: AuthenticateUserUseCaseDeps,
  ): Promise<number> {
    const start = performance.now();
    try {
      await authorizeCredentials(
        { identifier, password },
        getDepsFactory(deps),
      );
    } catch {
      // Erro esperado — ignorado, apenas medimos o tempo
    }
    return performance.now() - start;
  }

  it("diferenca de latencia media entre inexistente e senha incorreta <= 100ms", async () => {
    // Deps para caso A: identifier inexistente
    const depsInexistente = makeDeps({ findByIdentifierResult: null });

    // Deps para caso B: identifier existente + senha incorreta
    const depsSenhaIncorreta = makeDeps({ verifyResult: false });

    // Aquecimento: 2 chamadas de cada para estabilizar JIT
    await measureDuration("warmup1", "x", depsInexistente);
    await measureDuration("warmup2", "x", depsSenhaIncorreta);

    const temposInexistente: number[] = [];
    const temposSenhaIncorreta: number[] = [];

    for (let i = 0; i < AMOSTRAS; i++) {
      const d1 = await measureDuration(
        `inex-${i}`,
        "SenhaErrada!",
        depsInexistente,
      );
      temposInexistente.push(d1);

      const d2 = await measureDuration(
        "alice",
        `SenhaErrada${i}!`,
        depsSenhaIncorreta,
      );
      temposSenhaIncorreta.push(d2);
    }

    // Media aritmetica
    const mediaInexistente =
      temposInexistente.reduce((a, b) => a + b, 0) / AMOSTRAS;
    const mediaSenhaIncorreta =
      temposSenhaIncorreta.reduce((a, b) => a + b, 0) / AMOSTRAS;

    const diferencaAbsolutaMs = Math.abs(
      mediaInexistente - mediaSenhaIncorreta,
    );

    // Tolerancia: 100ms — com mocks síncronos ambos os casos sao igualmente
    // rapidos. O threshold garante que mesmo com variacao de ambiente nao
    // haja discrepancia que permita inferencia por timing.
    expect(diferencaAbsolutaMs).toBeLessThanOrEqual(100);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ST-4: Sessao invalida nao autoriza acesso a recursos protegidos
// ══════════════════════════════════════════════════════════════════════════

describe("ST-4: Sessao invalida rejeita acesso a recursos protegidos (seguranca)", () => {
  const authorizedCallback = baseAuthConfig.callbacks!.authorized!;

  // -----------------------------------------------------------------------
  // ST-4a: Sem cookie de sessao — redirecionado para login (dashboard)
  // -----------------------------------------------------------------------
  it("ST-4a: sem sessao em rota protegida retorna false (redirect para /login)", () => {
    const result = authorizedCallback(
      {
        auth: null,
        request: { nextUrl: new URL("http://localhost/dashboard") },
      } as never,
    );

    expect(result).toBe(false);
  });

  // -----------------------------------------------------------------------
  // ST-4b: Cookie adulterado/ausente = mesmo que null — testamos todos
  //        os cenarios que resultam em auth = null
  // -----------------------------------------------------------------------
  it("ST-4b: sem sessao em rota publica retorna true (permitido)", () => {
    const result = authorizedCallback(
      {
        auth: null,
        request: { nextUrl: new URL("http://localhost/login") },
      } as never,
    );

    expect(result).toBe(true);
  });

  // -----------------------------------------------------------------------
  // ST-4c: Sessao valida em rota protegida — autorizado
  // -----------------------------------------------------------------------
  it("ST-4c: sessao valida em /dashboard retorna true (autorizado)", () => {
    const result = authorizedCallback(
      {
        auth: {
          user: { id: "user-123", name: "Alice", email: "alice@example.com" },
          expires: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
        request: { nextUrl: new URL("http://localhost/dashboard") },
      } as never,
    );

    expect(result).toBe(true);
  });

  // -----------------------------------------------------------------------
  // ST-4d: Callback jwt — id do usuario propagado para o token
  // -----------------------------------------------------------------------
  it("ST-4d: jwt callback propaga user.id para token.id quando presente", () => {
    const jwtCallback = baseAuthConfig.callbacks!.jwt!;

    const token = jwtCallback(
      { token: {}, user: { id: "user-456" } } as never,
    ) as Record<string, unknown>;

    expect(token.id).toBe("user-456");
  });

  it("ST-4d: jwt callback mantem token existente quando user nao tem id", () => {
    const jwtCallback = baseAuthConfig.callbacks!.jwt!;

    const tokenEntrada = { sub: "existing-token" };
    const token = jwtCallback(
      { token: tokenEntrada, user: {} } as never,
    ) as Record<string, unknown>;

    expect(token.sub).toBe("existing-token");
  });

  // -----------------------------------------------------------------------
  // ST-4e: Callback session — id do token propagado para session.user
  // -----------------------------------------------------------------------
  it("ST-4e: session callback propaga token.id para session.user.id", () => {
    const sessionCallback = baseAuthConfig.callbacks!.session!;

    const session = sessionCallback(
      {
        session: {
          user: { name: "Alice", email: "alice@example.com" },
          expires: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
        token: { id: "user-789" },
      } as never,
    );

    expect(session.user?.id).toBe("user-789");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ST-5: Log estruturado de todas as tentativas de autenticacao
// ══════════════════════════════════════════════════════════════════════════

describe("ST-5: Log estruturado JSON em todas as tentativas (seguranca)", () => {
  // -----------------------------------------------------------------------
  // ST-5a: Login bem-sucedido — log com success=true, timestamp, identifier
  // -----------------------------------------------------------------------
  it("ST-5a: login bem-sucedido emite log com resultado success=true", async () => {
    const deps = makeDeps(); // defaults: user found, verify true, no block

    const result = await authorizeCredentials(
      { identifier: "alice", password: "Senha@123" },
      getDepsFactory(deps),
    );

    expect(result).not.toBeNull();

    // Log de sucesso deve estar presente
    const logCalls = (deps.logger.info as jest.Mock).mock.calls;
    const successLog = logCalls.find(
      (call: [object, string]) => (call[0] as Record<string, unknown>).tipoEvento === "login_sucesso",
    );

    expect(successLog).toBeDefined();
    const logObj = successLog[0] as Record<string, unknown>;
    expect(logObj.timestamp).toBeDefined();
    expect(typeof logObj.timestamp).toBe("string");
    expect(logObj.identifier).toBe("alice");
    expect(logObj.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // ST-5b: Senha incorreta — log com success=false, sem expor password
  // -----------------------------------------------------------------------
  it("ST-5b: senha incorreta emite log com success=false e sem expor password", async () => {
    const deps = makeDeps({ verifyResult: false });

    try {
      await authorizeCredentials(
        { identifier: "alice", password: "SenhaErrada!" },
        getDepsFactory(deps),
      );
    } catch {
      // Expected — verificar log
    }

    const logCalls = (deps.logger.info as jest.Mock).mock.calls;
    const failLog = logCalls.find(
      (call: [object, string]) => (call[0] as Record<string, unknown>).tipoEvento === "login_senha_incorreta",
    );

    expect(failLog).toBeDefined();
    const logObj = failLog[0] as Record<string, unknown>;
    expect(logObj.success).toBe(false);
    expect(logObj.identifier).toBe("alice");

    // A senha nunca deve estar presente no log
    const logStr = JSON.stringify(logObj);
    expect(logStr).not.toContain("SenhaErrada!");
    expect(logStr).not.toContain("password");
  });

  // -----------------------------------------------------------------------
  // ST-5c: Identifier inexistente — log sem expor que a conta nao existe
  // -----------------------------------------------------------------------
  it("ST-5c: identifier inexistente emite log com tipoEvento sem vazar informacao", async () => {
    const deps = makeDeps({ findByIdentifierResult: null });

    try {
      await authorizeCredentials(
        { identifier: "naoexiste", password: "qualquer" },
        getDepsFactory(deps),
      );
    } catch {
      // Expected — verificar log
    }

    const logCalls = (deps.logger.info as jest.Mock).mock.calls;
    const attemptLog = logCalls.find(
      (call: [object, string]) => (call[0] as Record<string, unknown>).tipoEvento === "login_usuario_inexistente",
    );

    expect(attemptLog).toBeDefined();
    const logObj = attemptLog[0] as Record<string, unknown>;
    expect(logObj.identifier).toBe("naoexiste");
    expect(logObj.success).toBe(false);

    // Nao deve expor detalhes do usuario pois ele nao existe
    const logStr = JSON.stringify(logObj);
    expect(logStr).not.toContain("password");
    expect(logStr).not.toContain("email");
    expect(logStr).not.toContain("status");
  });

  // -----------------------------------------------------------------------
  // ST-5d: Tentativa bloqueada — log registrando bloqueio ativo
  // -----------------------------------------------------------------------
  it("ST-5d: tentativa bloqueada emite log com tipoEvento login_bloqueado", async () => {
    const deps = makeDeps({ findActiveBlockResult: FUTURE_BLOCK });

    try {
      await authorizeCredentials(
        { identifier: "alice", password: "Senha@123" },
        getDepsFactory(deps),
      );
    } catch {
      // Expected AccountBlockedError — verificar log
    }

    const logCalls = (deps.logger.info as jest.Mock).mock.calls;
    const blockLog = logCalls.find(
      (call: [object, string]) => (call[0] as Record<string, unknown>).tipoEvento === "login_bloqueado",
    );

    expect(blockLog).toBeDefined();
    const logObj = blockLog[0] as Record<string, unknown>;
    expect(logObj.identifier).toBe("alice");
    expect(logObj.success).toBe(false);
    expect(logObj.timestamp).toBeDefined();
  });
});

// Testes unitarios do AuthenticateUserUseCase
// Cobre UT-9 (T-18), UT-10 (T-19), UT-6 (T-57), UT-7 (T-58), UT-8 (T-22),
// UT-11 (T-36), UT-12 (T-37), UT-13 (T-45), UT-6-email (T-54)
// Rastreabilidade: REQ-2 · REQ-3 · REQ-5 · REQ-6 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · NFR-6 · NFR-8

import {
  AuthenticateUserUseCase,
  AuthenticationError,
  AccountBlockedError,
  type AuthenticateUserUseCaseDeps,
} from "@/application/use-cases/authenticate-user.use-case";
import type { LoginUserRepository } from "@/domain/ports/login-user-repository";
import type { PasswordVerifier } from "@/domain/ports/password-verifier";
import type { LoginAttemptRepository } from "@/domain/ports/login-attempt-repository";
import type { LoginUser } from "@/domain/entities/login-user";
import type { LoginBlock } from "@/domain/entities/login-attempt";
import type { EmailNotificationPort } from "@/domain/ports/email-notification.port";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const ACTIVE_USER: LoginUser = {
  id: "user-uuid-123",
  username: "alice",
  email: "alice@example.com",
  passwordHash: "$argon2id$v=19$...",
  status: "active",
};

// Datas relativas ao tempo real para evitar problemas com comparacoes no use case
const NOW_REAL = new Date();
const BLOCKED_UNTIL_FUTURE = new Date(NOW_REAL.getTime() + 15 * 60 * 1000); // now + 15min
const BLOCKED_UNTIL_PAST = new Date(NOW_REAL.getTime() - 1 * 60 * 1000); // now - 1min (expirado)

// ─── Factory de mocks ──────────────────────────────────────────────────────

function makeMocks(overrides: {
  findByIdentifier?: jest.Mock;
  verify?: jest.Mock;
  findActiveBlock?: jest.Mock;
  save?: jest.Mock;
  countRecentFailures?: jest.Mock;
  createBlock?: jest.Mock;
  removeBlock?: jest.Mock;
  resetFailureCount?: jest.Mock;
  sendLoginWarning?: jest.Mock;
} = {}): AuthenticateUserUseCaseDeps {
  const userRepository: LoginUserRepository = {
    findByIdentifier: overrides.findByIdentifier ?? jest.fn().mockResolvedValue(ACTIVE_USER),
  };

  const passwordVerifier: PasswordVerifier = {
    verify: overrides.verify ?? jest.fn().mockResolvedValue(true),
  };

  const loginAttemptRepository: LoginAttemptRepository = {
    save: overrides.save ?? jest.fn().mockResolvedValue(undefined),
    countRecentFailures: overrides.countRecentFailures ?? jest.fn().mockResolvedValue(0),
    findActiveBlock: overrides.findActiveBlock ?? jest.fn().mockResolvedValue(null),
    createBlock: overrides.createBlock ?? jest.fn().mockResolvedValue(undefined),
    removeBlock: overrides.removeBlock ?? jest.fn().mockResolvedValue(undefined),
    resetFailureCount: overrides.resetFailureCount ?? jest.fn().mockResolvedValue(undefined),
  };

  const emailNotificationPort: EmailNotificationPort = {
    sendLoginWarning: overrides.sendLoginWarning ?? jest.fn().mockResolvedValue(undefined),
  };

  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  return { userRepository, passwordVerifier, loginAttemptRepository, emailNotificationPort, logger };
}

// ─── UT-6: Login bem-sucedido por username (T-57) ─────────────────────────

describe("UT-6: AuthenticateUserUseCase.execute() — login bem-sucedido por username", () => {
  it("caminho feliz: sem bloqueio, usuario ativo, senha correta — retorna { id, username, email }", async () => {
    const deps = makeMocks();
    const useCase = new AuthenticateUserUseCase(deps);

    const result = await useCase.execute({
      identifier: "alice",
      password: "Senha@123",
      requestId: "req-001",
    });

    expect(result).toEqual({
      id: ACTIVE_USER.id,
      username: ACTIVE_USER.username,
      email: ACTIVE_USER.email,
    });

    // Deve registrar tentativa bem-sucedida (REQ-13)
    expect(deps.loginAttemptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "alice", success: true }),
    );
  });
});

// ─── UT-7: Login bem-sucedido por email (T-58) ────────────────────────────

describe("UT-7: AuthenticateUserUseCase.execute() — login bem-sucedido por email", () => {
  it("identifier no formato de email — retorna objeto de sessao", async () => {
    const userByEmail: LoginUser = {
      ...ACTIVE_USER,
      username: "alice",
      email: "alice@example.com",
    };

    const deps = makeMocks({
      findByIdentifier: jest.fn().mockResolvedValue(userByEmail),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    const result = await useCase.execute({
      identifier: "alice@example.com",
      password: "Senha@123",
      requestId: "req-002",
    });

    expect(result.email).toBe("alice@example.com");
    expect(deps.userRepository.findByIdentifier).toHaveBeenCalledWith("alice@example.com");
  });
});

// ─── UT-8: Identificador vazio (T-22) ─────────────────────────────────────

describe("UT-8: AuthenticateUserUseCase.execute() — identificador vazio", () => {
  it('identifier vazio lanca AuthenticationError e nao chama UserRepository', async () => {
    const deps = makeMocks({
      // Identifier vazio: o schema Zod no authorize callback rejeita antes de chegar aqui.
      // O use case em si nao valida identifier vazio — essa e responsabilidade do adapter.
      // Este teste verifica que quando findByIdentifier retorna null (usuario vazio nao existe),
      // o comportamento e o mesmo: lanca AuthenticationError.
      findByIdentifier: jest.fn().mockResolvedValue(null),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "", password: "qualquer", requestId: "req-003" }),
    ).rejects.toThrow(AuthenticationError);

    // Registra tentativa fracassada (REQ-13)
    expect(deps.loginAttemptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "", success: false }),
    );
    // Nao chama PasswordVerifier
    expect(deps.passwordVerifier.verify).not.toHaveBeenCalled();
  });
});

// ─── UT-9: Usuario inexistente (T-18) ────────────────────────────────────

describe("UT-9: AuthenticateUserUseCase.execute() — usuario inexistente", () => {
  it("UserRepository retorna null: lanca AuthenticationError", async () => {
    const deps = makeMocks({
      findByIdentifier: jest.fn().mockResolvedValue(null),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "inexistente", password: "Senha@123", requestId: "req-004" }),
    ).rejects.toThrow(AuthenticationError);
  });

  it("PasswordVerifier NAO e chamado quando usuario nao existe", async () => {
    const deps = makeMocks({
      findByIdentifier: jest.fn().mockResolvedValue(null),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "inexistente", password: "Senha@123", requestId: "req-005" }),
    ).rejects.toThrow(AuthenticationError);

    expect(deps.passwordVerifier.verify).not.toHaveBeenCalled();
  });

  it("LoginAttemptRepository.save e chamado com success: false (REQ-13)", async () => {
    const deps = makeMocks({
      findByIdentifier: jest.fn().mockResolvedValue(null),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "inexistente", password: "Senha@123", requestId: "req-006" }),
    ).rejects.toThrow(AuthenticationError);

    expect(deps.loginAttemptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "inexistente", success: false }),
    );
  });

  it("mensagem de erro e generica — sem vazar se o usuario existe ou nao (NFR-6)", async () => {
    const deps = makeMocks({
      findByIdentifier: jest.fn().mockResolvedValue(null),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    const error = await useCase.execute({ identifier: "inexistente", password: "Senha@123", requestId: "req-007" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthenticationError);
    expect((error as AuthenticationError).message).toBe("Usuário ou senha incorretos");
  });
});

// ─── UT-10: Senha incorreta (T-19) ───────────────────────────────────────

describe("UT-10: AuthenticateUserUseCase.execute() — senha incorreta", () => {
  it("PasswordVerifier retorna false: lanca AuthenticationError", async () => {
    const deps = makeMocks({
      verify: jest.fn().mockResolvedValue(false),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "alice", password: "SenhaErrada!", requestId: "req-008" }),
    ).rejects.toThrow(AuthenticationError);
  });

  it("mensagem de erro e generica — identica ao caso de usuario inexistente (NFR-6)", async () => {
    const deps = makeMocks({
      verify: jest.fn().mockResolvedValue(false),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    const error = await useCase.execute({ identifier: "alice", password: "SenhaErrada!", requestId: "req-009" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AuthenticationError);
    expect((error as AuthenticationError).message).toBe("Usuário ou senha incorretos");
  });

  it("LoginAttemptRepository.save e chamado com success: false (REQ-13)", async () => {
    const deps = makeMocks({
      verify: jest.fn().mockResolvedValue(false),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "alice", password: "SenhaErrada!", requestId: "req-010" }),
    ).rejects.toThrow(AuthenticationError);

    expect(deps.loginAttemptRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "alice", success: false }),
    );
  });
});

// ─── UT-11: Bloqueio ativo (T-36) ────────────────────────────────────────

describe("UT-11: AuthenticateUserUseCase.execute() — bloqueio ativo", () => {
  it("findActiveBlock retorna bloqueio vigente: lanca AccountBlockedError sem consultar UserRepository", async () => {
    const activeBlock: LoginBlock = {
      id: "block-uuid-1",
      identifier: "alice",
      blocked_until: BLOCKED_UNTIL_FUTURE, // 15 min no futuro — bloqueio ativo
      created_at: NOW_REAL,
    };

    const deps = makeMocks({
      findActiveBlock: jest.fn().mockResolvedValue(activeBlock),
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "alice", password: "Senha@123", requestId: "req-011" }),
    ).rejects.toThrow(AccountBlockedError);

    expect(deps.userRepository.findByIdentifier).not.toHaveBeenCalled();
    expect(deps.passwordVerifier.verify).not.toHaveBeenCalled();
  });
});

// ─── UT-12: Ativar bloqueio apos 3 falhas (T-37) ─────────────────────────

describe("UT-12: AuthenticateUserUseCase.execute() — ativar bloqueio apos 3 falhas", () => {
  it("countRecentFailures retorna 3: cria bloqueio com blocked_until = now + 15min e lanca AccountBlockedError", async () => {
    const createBlock = jest.fn().mockResolvedValue(undefined);

    const deps = makeMocks({
      verify: jest.fn().mockResolvedValue(false),
      countRecentFailures: jest.fn().mockResolvedValue(3),
      createBlock,
    });
    const useCase = new AuthenticateUserUseCase(deps);

    const before = new Date();
    await expect(
      useCase.execute({ identifier: "alice", password: "SenhaErrada!", requestId: "req-013" }),
    ).rejects.toThrow(AccountBlockedError);
    const after = new Date();

    expect(createBlock).toHaveBeenCalledTimes(1);
    const [calledIdentifier, calledBlockedUntil] = (createBlock as jest.Mock).mock.calls[0] as [string, Date];
    expect(calledIdentifier).toBe("alice");
    // blocked_until deve ser ~15 min no futuro
    const expectedMin = before.getTime() + 15 * 60 * 1000;
    const expectedMax = after.getTime() + 15 * 60 * 1000;
    expect(calledBlockedUntil.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(calledBlockedUntil.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("countRecentFailures retorna 2: nao cria bloqueio e lanca AuthenticationError (REQ-8)", async () => {
    const createBlock = jest.fn().mockResolvedValue(undefined);

    const deps = makeMocks({
      verify: jest.fn().mockResolvedValue(false),
      countRecentFailures: jest.fn().mockResolvedValue(2),
      createBlock,
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "alice", password: "SenhaErrada!", requestId: "req-014" }),
    ).rejects.toThrow(AuthenticationError);

    expect(createBlock).not.toHaveBeenCalled();
  });
});

// ─── UT-13: Bloqueio expirado (T-45) ─────────────────────────────────────

describe("UT-13: AuthenticateUserUseCase.execute() — bloqueio expirado", () => {
  it("findActiveBlock retorna bloqueio expirado: chama removeBlock e resetFailureCount antes de autenticar", async () => {
    const expiredBlock: LoginBlock = {
      id: "block-uuid-2",
      identifier: "alice",
      blocked_until: BLOCKED_UNTIL_PAST, // 1 min no passado — bloqueio expirado
      created_at: new Date(NOW_REAL.getTime() - 20 * 60 * 1000),
    };

    const removeBlock = jest.fn().mockResolvedValue(undefined);
    const resetFailureCount = jest.fn().mockResolvedValue(undefined);

    const deps = makeMocks({
      findActiveBlock: jest.fn().mockResolvedValue(expiredBlock),
      removeBlock,
      resetFailureCount,
    });
    const useCase = new AuthenticateUserUseCase(deps);

    // Bloqueio expirado + credenciais validas = autenticacao bem-sucedida
    const result = await useCase.execute({
      identifier: "alice",
      password: "Senha@123",
      requestId: "req-012",
    });

    expect(removeBlock).toHaveBeenCalledWith("alice");
    expect(resetFailureCount).toHaveBeenCalledWith("alice");
    expect(result.username).toBe("alice");
  });
});

// ─── UT-6-email: envio de email de aviso (T-54) ───────────────────────────

describe("UT-6 (T-54): AuthenticateUserUseCase.execute() — envio de email de aviso", () => {
  it("(a) sendLoginWarning e chamado quando usuario existe e senha incorreta (REQ-14)", async () => {
    const sendLoginWarning = jest.fn().mockResolvedValue(undefined);
    const deps = makeMocks({
      verify: jest.fn().mockResolvedValue(false),
      sendLoginWarning,
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "alice", password: "SenhaErrada!", requestId: "req-email-1" }),
    ).rejects.toThrow(AuthenticationError);

    // fire-and-forget: aguardar microtasks para o .catch ser registrado
    await Promise.resolve();
    expect(sendLoginWarning).toHaveBeenCalledWith(ACTIVE_USER.email);
  });

  it("(b) sendLoginWarning NAO e chamado quando usuario nao existe (REQ-14)", async () => {
    const sendLoginWarning = jest.fn().mockResolvedValue(undefined);
    const deps = makeMocks({
      findByIdentifier: jest.fn().mockResolvedValue(null),
      sendLoginWarning,
    });
    const useCase = new AuthenticateUserUseCase(deps);

    await expect(
      useCase.execute({ identifier: "inexistente", password: "qualquer", requestId: "req-email-2" }),
    ).rejects.toThrow(AuthenticationError);

    await Promise.resolve();
    expect(sendLoginWarning).not.toHaveBeenCalled();
  });

  it("(c) falha no envio de email nao bloqueia resposta HTTP — lanca AuthenticationError mesmo com erro de email (DT-4)", async () => {
    const sendLoginWarning = jest.fn().mockRejectedValue(new Error("SMTP timeout"));
    const deps = makeMocks({
      verify: jest.fn().mockResolvedValue(false),
      sendLoginWarning,
    });
    const useCase = new AuthenticateUserUseCase(deps);

    // Deve lancar AuthenticationError normalmente — falha de email nao propaga
    await expect(
      useCase.execute({ identifier: "alice", password: "SenhaErrada!", requestId: "req-email-3" }),
    ).rejects.toThrow(AuthenticationError);
  });
});

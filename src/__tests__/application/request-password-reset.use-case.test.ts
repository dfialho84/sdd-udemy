// Testes unitarios do RequestPasswordResetUseCase
// UT-4 (email de conta ativa), UT-5 (email inexistente — anti-enumeracao)
// Rastreabilidade: T-07 · REQ-4 · REQ-5 · REQ-2 · REQ-14

import {
  RequestPasswordResetUseCase,
  type RequestPasswordResetUseCaseDeps,
} from "@/application/use-cases/request-password-reset.use-case";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { IPasswordResetTokenRepository } from "@/domain/ports/password-reset-token-repository";
import type { IEmailService } from "@/domain/ports/password-reset-email-service";
import type { AuditLogger } from "@/domain/ports/audit-logger";
import { User } from "@/domain/entities/user";
import type { UserProps } from "@/domain/entities/user";

// ─── Fixtures ──────────────────────────────────────────────────────────

const ACTIVE_USER_PROPS: UserProps = {
  id: "user-uuid-123",
  name: "Alice",
  username: "alice",
  email: "alice@example.com",
  passwordHash: "$argon2id$v=19$...",
  birthDate: new Date("1990-01-01"),
  avatarKey: null,
  status: "active",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const ACTIVE_USER = new User(ACTIVE_USER_PROPS);

const GENERIC_MESSAGE =
  "Se existe conta com esse email, voce recebera um link de recuperacao";

// ─── Factory de mocks ──────────────────────────────────────────────────

function makeMocks(overrides: {
  findByEmail?: jest.Mock;
  create?: jest.Mock;
  sendPasswordReset?: jest.Mock;
  log?: jest.Mock;
} = {}): RequestPasswordResetUseCaseDeps {
  const userRepository: UserRepository = {
    findByEmail: overrides.findByEmail ?? jest.fn().mockResolvedValue(ACTIVE_USER),
    findByUsername: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    activate: jest.fn(),
  };

  const passwordResetTokenRepository: IPasswordResetTokenRepository = {
    create: overrides.create ?? jest.fn().mockResolvedValue(undefined),
    findByHash: jest.fn(),
    markAsUsed: jest.fn(),
  };

  const emailService: IEmailService = {
    sendPasswordReset:
      overrides.sendPasswordReset ?? jest.fn().mockResolvedValue(undefined),
  };

  const auditLogger: AuditLogger = {
    log: overrides.log ?? jest.fn().mockResolvedValue(undefined),
  };

  return { userRepository, passwordResetTokenRepository, emailService, auditLogger };
}

// ─── UT-4: Email de conta ativa ────────────────────────────────────────

describe("UT-4: RequestPasswordResetUseCase.execute() — email de conta ativa", () => {
  it("gera token com expiracao de 12h, persiste hash e solicita envio de email (REQ-4 · REQ-5)", async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const sendPasswordReset = jest.fn().mockResolvedValue(undefined);
    const log = jest.fn().mockResolvedValue(undefined);
    const useCase = new RequestPasswordResetUseCase(
      makeMocks({ create, sendPasswordReset, log }),
    );

    const beforeCall = Date.now();
    const result = await useCase.execute("alice@example.com");

    // Verifica mensagem generica (REQ-2)
    expect(result.message).toBe(GENERIC_MESSAGE);

    // Verifica que create foi chamado com userId, tokenHash e expiresAt
    expect(create).toHaveBeenCalledTimes(1);
    const createArg = create.mock.calls[0]![0]!;
    expect(createArg.userId).toBe(ACTIVE_USER.id);
    expect(createArg.tokenHash).toEqual(expect.any(String));
    expect(createArg.tokenHash.length).toBe(64); // SHA-256 hex = 64 chars

    // expires_at deve ser now + 12h (com tolerancia de 1s)
    const expiresAtMs = createArg.expiresAt.getTime();
    const nowMs = beforeCall;
    const diffHours = (expiresAtMs - nowMs) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThanOrEqual(11.9);
    expect(diffHours).toBeLessThanOrEqual(12.1);

    // Verifica que email foi disparado (REQ-5)
    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
    expect(sendPasswordReset).toHaveBeenCalledWith(
      "alice@example.com",
      expect.any(String),
    );

    // Verifica que auditLogger foi chamado (NFR-6)
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PASSWORD_RESET_REQUESTED",
        userId: ACTIVE_USER.id,
        email: "alice@example.com",
      }),
    );
  });
});

// ─── UT-5: Email inexistente (anti-enumeracao) ─────────────────────────

describe("UT-5: RequestPasswordResetUseCase.execute() — email inexistente (REQ-14)", () => {
  it("nao gera token, nao envia email, retorna mesma mensagem generica", async () => {
    const findByEmail = jest.fn().mockResolvedValue(null);
    const create = jest.fn();
    const sendPasswordReset = jest.fn();
    const log = jest.fn().mockResolvedValue(undefined);
    const useCase = new RequestPasswordResetUseCase(
      makeMocks({ findByEmail, create, sendPasswordReset, log }),
    );

    const result = await useCase.execute("inexistente@example.com");

    // Mensagem generica identica ao caminho feliz (REQ-2 · REQ-14)
    expect(result.message).toBe(GENERIC_MESSAGE);

    // Nao deve gerar token (REQ-14)
    expect(create).not.toHaveBeenCalled();

    // Nao deve enviar email (REQ-14)
    expect(sendPasswordReset).not.toHaveBeenCalled();

    // Deve registrar auditoria para email inexistente (NFR-6)
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PASSWORD_RESET_EMAIL_NOT_FOUND",
        email: "inexistente@example.com",
      }),
    );
  });

  it("nao gera token nem envia email para conta inativa", async () => {
    const inactiveUser = new User({ ...ACTIVE_USER_PROPS, status: "pending" });
    const findByEmail = jest.fn().mockResolvedValue(inactiveUser);
    const create = jest.fn();
    const sendPasswordReset = jest.fn();
    const log = jest.fn().mockResolvedValue(undefined);
    const useCase = new RequestPasswordResetUseCase(
      makeMocks({ findByEmail, create, sendPasswordReset, log }),
    );

    const result = await useCase.execute("pending@example.com");

    expect(result.message).toBe(GENERIC_MESSAGE);
    expect(create).not.toHaveBeenCalled();
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });

  it("resposta identica ao caminho feliz (sem distincao observavel externamente)", async () => {
    const createHappy = jest.fn().mockResolvedValue(undefined);
    const sendHappy = jest.fn().mockResolvedValue(undefined);

    const happyUseCase = new RequestPasswordResetUseCase(
      makeMocks({ create: createHappy, sendPasswordReset: sendHappy }),
    );
    const happyResult = await happyUseCase.execute("alice@example.com");

    const createAnti = jest.fn();
    const sendAnti = jest.fn();
    const findByEmailAnti = jest.fn().mockResolvedValue(null);
    const antiUseCase = new RequestPasswordResetUseCase(
      makeMocks({
        findByEmail: findByEmailAnti,
        create: createAnti,
        sendPasswordReset: sendAnti,
      }),
    );
    const antiResult = await antiUseCase.execute("inexistente@example.com");

    // Ambas as respostas sao identicas (REQ-14)
    expect(happyResult.message).toBe(antiResult.message);
  });
});

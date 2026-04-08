// Testes unitários — RegisterUserUseCase
// UT-3: Rastreabilidade: REQ-3 · REQ-7 · REQ-8 · REQ-9 · NFR-2 · NFR-6 · T-06

import {
  RegisterUserUseCase,
  RegisterUserUseCaseError,
  type RegisterUserUseCaseDeps,
  type RegisterUserInput,
} from "@/application/use-cases/register-user.use-case";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { TokenGenerator } from "@/domain/ports/token-generator";
import type { EmailService } from "@/domain/ports/email-service";
import type { ConfirmationTokenRepository } from "@/domain/ports/confirmation-token-repository";
import { User } from "@/domain/entities/user";
import { ConfirmationToken } from "@/domain/entities/confirmation-token";

// --- Helpers ---

function makeUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: "user-id-1",
    name: "João Silva",
    email: "joao@example.com",
    passwordHash: "$argon2id$hash",
    birthDate: new Date("1990-01-01"),
    avatarKey: null,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function makeToken(): ConfirmationToken {
  return new ConfirmationToken({
    id: "token-id-1",
    userId: "user-id-1",
    token: "abc123hex",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
  });
}

function makeDeps(overrides: Partial<RegisterUserUseCaseDeps> = {}): RegisterUserUseCaseDeps {
  const userRepository: jest.Mocked<UserRepository> = {
    create: jest.fn().mockResolvedValue(makeUser()),
    findByEmail: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    delete: jest.fn().mockResolvedValue(undefined),
    activate: jest.fn().mockResolvedValue(undefined),
  };

  const passwordHasher: jest.Mocked<PasswordHasher> = {
    hash: jest.fn().mockResolvedValue("$argon2id$hash"),
  };

  const tokenGenerator: jest.Mocked<TokenGenerator> = {
    generate: jest.fn().mockReturnValue("abc123hex"),
  };

  const emailService: jest.Mocked<EmailService> = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  const confirmationTokenRepository: jest.Mocked<ConfirmationTokenRepository> = {
    create: jest.fn().mockResolvedValue(makeToken()),
    findByToken: jest.fn().mockResolvedValue(null),
    markAsUsed: jest.fn().mockResolvedValue(undefined),
  };

  const logger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  return {
    userRepository,
    passwordHasher,
    tokenGenerator,
    emailService,
    confirmationTokenRepository,
    appBaseUrl: "https://app.example.com",
    logger,
    ...overrides,
  };
}

function makeInput(overrides: Partial<RegisterUserInput> = {}): RegisterUserInput {
  return {
    name: "João Silva",
    email: "joao@example.com",
    password: "Senha@123",
    birthDate: new Date("1990-01-01"),
    avatarKey: null,
    requestId: "req-id-abc",
    ...overrides,
  };
}

// --- Testes ---

describe("UT-3: RegisterUserUseCase.execute()", () => {
  describe("Caminho feliz — email inédito", () => {
    it("retorna mensagem de sucesso", async () => {
      const deps = makeDeps();
      const useCase = new RegisterUserUseCase(deps);

      const result = await useCase.execute(makeInput());

      expect(result.message).toBe("Um link de confirmacao foi enviado ao seu email.");
    });

    it("chama passwordHasher.hash com a senha fornecida", async () => {
      const deps = makeDeps();
      const useCase = new RegisterUserUseCase(deps);

      await useCase.execute(makeInput({ password: "Senha@123" }));

      expect((deps.passwordHasher as jest.Mocked<PasswordHasher>).hash).toHaveBeenCalledWith(
        "Senha@123",
      );
    });

    it("cria o usuário com status 'pending' (REQ-8)", async () => {
      const deps = makeDeps();
      const useCase = new RegisterUserUseCase(deps);

      await useCase.execute(makeInput());

      const createCall = (deps.userRepository as jest.Mocked<UserRepository>).create.mock
        .calls[0][0];
      expect(createCall.status).toBe("pending");
    });

    it("cria o usuário com os dados fornecidos", async () => {
      const deps = makeDeps();
      const useCase = new RegisterUserUseCase(deps);
      const input = makeInput({ name: "Maria Souza", email: "maria@example.com" });

      await useCase.execute(input);

      const createCall = (deps.userRepository as jest.Mocked<UserRepository>).create.mock
        .calls[0][0];
      expect(createCall.name).toBe("Maria Souza");
      expect(createCall.email).toBe("maria@example.com");
    });

    it("persiste o token de confirmação com expiresAt +24h (REQ-9)", async () => {
      const deps = makeDeps();
      const useCase = new RegisterUserUseCase(deps);
      const before = Date.now();

      await useCase.execute(makeInput());

      const after = Date.now();
      const createCall = (
        deps.confirmationTokenRepository as jest.Mocked<ConfirmationTokenRepository>
      ).create.mock.calls[0][0];

      const minExpected = new Date(before + 24 * 60 * 60 * 1000);
      const maxExpected = new Date(after + 24 * 60 * 60 * 1000);

      expect(createCall.expiresAt.getTime()).toBeGreaterThanOrEqual(minExpected.getTime());
      expect(createCall.expiresAt.getTime()).toBeLessThanOrEqual(maxExpected.getTime());
      expect(createCall.usedAt).toBeNull();
    });

    it("envia o email com a URL de confirmação correta (REQ-9)", async () => {
      const deps = makeDeps();
      const useCase = new RegisterUserUseCase(deps);

      await useCase.execute(makeInput({ email: "joao@example.com" }));

      const sendCall = (deps.emailService as jest.Mocked<EmailService>).send.mock.calls[0][0];
      expect(sendCall.to).toBe("joao@example.com");
      expect(sendCall.confirmationUrl).toContain("abc123hex");
      expect(sendCall.confirmationUrl).toContain("https://app.example.com");
    });

    it("emite log estruturado JSON com tipoEvento=cadastro_criado (NFR-6)", async () => {
      const deps = makeDeps();
      const useCase = new RegisterUserUseCase(deps);

      await useCase.execute(makeInput({ requestId: "req-xyz" }));

      const logCall = (deps.logger as jest.Mocked<typeof deps.logger>).info.mock.calls[0][0];
      expect(logCall).toMatchObject({
        requestId: "req-xyz",
        tipoEvento: "cadastro_criado",
      });
      expect(logCall.email).not.toContain("joao@example.com");
      expect(logCall.timestamp).toBeDefined();
    });
  });

  describe("Email já cadastrado (REQ-3)", () => {
    it("lança RegisterUserUseCaseError com código 409", async () => {
      const deps = makeDeps();
      (deps.userRepository as jest.Mocked<UserRepository>).findByEmail.mockResolvedValue(
        makeUser(),
      );
      const useCase = new RegisterUserUseCase(deps);

      await expect(useCase.execute(makeInput())).rejects.toThrow(RegisterUserUseCaseError);
      await expect(useCase.execute(makeInput())).rejects.toMatchObject({ codigo: 409 });
    });

    it("lança erro com a mensagem exata do REQ-3", async () => {
      const deps = makeDeps();
      (deps.userRepository as jest.Mocked<UserRepository>).findByEmail.mockResolvedValue(
        makeUser(),
      );
      const useCase = new RegisterUserUseCase(deps);

      await expect(useCase.execute(makeInput())).rejects.toThrow(
        "Este email já está cadastrado. Tente fazer login ou use outro endereço.",
      );
    });

    it("não cria nenhum registro quando email já existe (REQ-7)", async () => {
      const deps = makeDeps();
      (deps.userRepository as jest.Mocked<UserRepository>).findByEmail.mockResolvedValue(
        makeUser(),
      );
      const useCase = new RegisterUserUseCase(deps);

      try {
        await useCase.execute(makeInput());
      } catch {
        // esperado
      }

      expect((deps.userRepository as jest.Mocked<UserRepository>).create).not.toHaveBeenCalled();
      expect(
        (deps.confirmationTokenRepository as jest.Mocked<ConfirmationTokenRepository>).create,
      ).not.toHaveBeenCalled();
      expect((deps.emailService as jest.Mocked<EmailService>).send).not.toHaveBeenCalled();
    });
  });

  describe("Falha no envio de email (NFR-6)", () => {
    it("loga o erro em JSON com tipoEvento=falha_envio_email", async () => {
      const deps = makeDeps();
      (deps.emailService as jest.Mocked<EmailService>).send.mockRejectedValue(
        new Error("SMTP connection refused"),
      );
      const useCase = new RegisterUserUseCase(deps);

      await useCase.execute(makeInput({ requestId: "req-fail" }));

      const errorCall = (deps.logger as jest.Mocked<typeof deps.logger>).error.mock.calls[0][0];
      expect(errorCall).toMatchObject({
        requestId: "req-fail",
        tipoEvento: "falha_envio_email",
        motivoFalha: "SMTP connection refused",
      });
      expect(errorCall.timestamp).toBeDefined();
    });

    it("não propaga a exceção de email — retorna resultado de sucesso", async () => {
      const deps = makeDeps();
      (deps.emailService as jest.Mocked<EmailService>).send.mockRejectedValue(
        new Error("SMTP connection refused"),
      );
      const useCase = new RegisterUserUseCase(deps);

      const result = await useCase.execute(makeInput());

      expect(result.message).toBe("Um link de confirmacao foi enviado ao seu email.");
    });

    it("a conta permanece com status 'pending' após falha de email", async () => {
      const deps = makeDeps();
      (deps.emailService as jest.Mocked<EmailService>).send.mockRejectedValue(
        new Error("SMTP timeout"),
      );
      const useCase = new RegisterUserUseCase(deps);

      await useCase.execute(makeInput());

      const createCall = (deps.userRepository as jest.Mocked<UserRepository>).create.mock
        .calls[0][0];
      expect(createCall.status).toBe("pending");
    });

    it("o token permanece válido após falha de email", async () => {
      const deps = makeDeps();
      (deps.emailService as jest.Mocked<EmailService>).send.mockRejectedValue(
        new Error("SMTP timeout"),
      );
      const useCase = new RegisterUserUseCase(deps);

      await useCase.execute(makeInput());

      expect(
        (deps.confirmationTokenRepository as jest.Mocked<ConfirmationTokenRepository>).create,
      ).toHaveBeenCalledTimes(1);
      expect(
        (deps.confirmationTokenRepository as jest.Mocked<ConfirmationTokenRepository>).markAsUsed,
      ).not.toHaveBeenCalled();
    });
  });
});

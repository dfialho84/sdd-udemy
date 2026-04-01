// Testes unitários — ConfirmAccountUseCase
// Rastreabilidade: UT-4 · REQ-10 a REQ-15 · NFR-3 · NFR-7 · T-40

import { ConfirmAccountUseCase, ConfirmAccountUseCaseError } from "@/application/use-cases/confirm-account.use-case";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { ConfirmationTokenRepository } from "@/domain/ports/confirmation-token-repository";

describe("ConfirmAccountUseCase", () => {
  let useCase: ConfirmAccountUseCase;
  let mockTokenRepository: jest.Mocked<ConfirmationTokenRepository>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockLogger: jest.Mocked<{ info: jest.Mock; error: jest.Mock }>;

  beforeEach(() => {
    mockTokenRepository = {
      findByToken: jest.fn(),
      markAsUsed: jest.fn(),
    };

    mockUserRepository = {
      activate: jest.fn(),
      delete: jest.fn(),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };

    useCase = new ConfirmAccountUseCase({
      confirmationTokenRepository: mockTokenRepository,
      userRepository: mockUserRepository,
      appBaseUrl: "https://app.example.com",
      logger: mockLogger,
    });
  });

  describe("execute(token)", () => {
    const baseToken = {
      id: "token-uuid-123",
      userId: "user-uuid-456",
      token: "test-token-value",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // futuro
      usedAt: null,
      createdAt: new Date(),
      isUsed: jest.fn().mockReturnValue(false),
      isExpired: jest.fn().mockReturnValue(false),
    };

    it("UT-4a: fluxo feliz — token válido ativa conta e marca como usado", async () => {
      mockTokenRepository.findByToken.mockResolvedValue({ ...baseToken });
      mockUserRepository.activate.mockResolvedValue(undefined);

      const result = await useCase.execute(baseToken.token);

      expect(mockTokenRepository.findByToken).toHaveBeenCalledWith(baseToken.token);
      expect(mockUserRepository.activate).toHaveBeenCalledWith(baseToken.userId);
      expect(mockTokenRepository.markAsUsed).toHaveBeenCalledWith(baseToken.id);

      expect(result.message).toBe("Sua conta foi ativada com sucesso! Você já pode fazer login.");
      expect(result.loginUrl).toBe("https://app.example.com/login");
      expect(result.registerUrl).toBe("https://app.example.com/register");
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("UT-4b: token não encontrado — retorna erro 404", async () => {
      mockTokenRepository.findByToken.mockResolvedValue(null);

      await expect(useCase.execute(baseToken.token)).rejects.toThrow(ConfirmAccountUseCaseError);

      try {
        await useCase.execute(baseToken.token);
      } catch (err) {
        if (err instanceof ConfirmAccountUseCaseError) {
          expect(err.codigo).toBe(404);
          expect(err.message).toBe("Link de confirmação inválido ou expirado.");
        } else {
          throw err;
        }
      }

      expect(mockUserRepository.activate).not.toHaveBeenCalled();
      expect(mockTokenRepository.markAsUsed).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("UT-4c: token já utilizado — retorna erro 409, status não alterado", async () => {
      const usedToken = {
        ...baseToken,
        usedAt: new Date(),
        isUsed: jest.fn().mockReturnValue(true),
        isExpired: jest.fn().mockReturnValue(false),
      };
      mockTokenRepository.findByToken.mockResolvedValue(usedToken);

      await expect(useCase.execute(baseToken.token)).rejects.toThrow(ConfirmAccountUseCaseError);

      try {
        await useCase.execute(baseToken.token);
      } catch (err) {
        if (err instanceof ConfirmAccountUseCaseError) {
          expect(err.codigo).toBe(409);
          expect(err.message).toBe("Este link de confirmação já foi utilizado.");
        } else {
          throw err;
        }
      }

      expect(mockUserRepository.activate).not.toHaveBeenCalled();
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
      expect(mockTokenRepository.markAsUsed).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ resultado: "link_ja_utilizado" }),
        "Link de confirmação já utilizado",
      );
    });

    it("UT-4d: token expirado — remove cadastro pendente, retorna erro 410", async () => {
      const expiredToken = {
        ...baseToken,
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás
        isExpired: () => true,
        isUsed: () => false,
      };
      mockTokenRepository.findByToken.mockResolvedValue(expiredToken);

      await expect(useCase.execute(baseToken.token)).rejects.toThrow(ConfirmAccountUseCaseError);

      try {
        await useCase.execute(baseToken.token);
      } catch (err) {
        if (err instanceof ConfirmAccountUseCaseError) {
          expect(err.codigo).toBe(410);
          expect(err.message).toBe("Este link de confirmação expirou. Por favor, solicite um novo.");
        } else {
          throw err;
        }
      }

      expect(mockUserRepository.delete).toHaveBeenCalledWith(baseToken.userId);
      expect(mockUserRepository.activate).not.toHaveBeenCalled();
      expect(mockTokenRepository.markAsUsed).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ resultado: "link_expirado" }),
        "Link de confirmação expirado",
      );
    });
  });
});

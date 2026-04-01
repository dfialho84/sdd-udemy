// ConfirmAccountUseCase — camada application
// Rastreabilidade: REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15 · NFR-3 · NFR-7 · T-36

import type { UserRepository } from "@/domain/ports/user-repository";
import type { ConfirmationTokenRepository } from "@/domain/ports/confirmation-token-repository";

export interface ConfirmAccountOutput {
  message: string;
  loginUrl: string;
  registerUrl: string;
}

/** Estrutura de erro padronizada (constitution.md, regra 5) */
export interface DomainError {
  codigo: number;
  mensagem: string;
}

export class ConfirmAccountUseCaseError extends Error {
  readonly codigo: number;

  constructor({ codigo, mensagem }: DomainError) {
    super(mensagem);
    this.name = "ConfirmAccountUseCaseError";
    this.codigo = codigo;
  }
}

export interface ConfirmAccountUseCaseDeps {
  confirmationTokenRepository: ConfirmationTokenRepository;
  userRepository: UserRepository;
  appBaseUrl: string;
  logger: { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };
}

/**
 * Orquestra o fluxo de confirmação de conta via token:
 * 1. Busca token por valor via confirmationTokenRepository.findByToken — erro 404 se não encontrado
 * 2. Verifica isUsed() — erro 409 e loga se já utilizado (NFR-7)
 * 3. Verifica isExpired() — remove cadastro pendente, loga e retorna erro 410 se expirado (REQ-12, NFR-7)
 * 4. Marca token como usado via markAsUsed
 * 5. Ativa conta via userRepository.activate
 * 6. Loga sucesso (NFR-7)
 */
export class ConfirmAccountUseCase {
  private readonly deps: ConfirmAccountUseCaseDeps;

  constructor(deps: ConfirmAccountUseCaseDeps) {
    this.deps = deps;
  }

  async execute(tokenValue: string): Promise<ConfirmAccountOutput> {
    const {
      confirmationTokenRepository,
      userRepository,
      appBaseUrl,
      logger,
    } = this.deps;

    // 1. Buscar token por valor — erro 404 se não encontrado (REQ-10)
    const token = await confirmationTokenRepository.findByToken(tokenValue);
    if (!token) {
      throw new ConfirmAccountUseCaseError({
        codigo: 404,
        mensagem: "Link de confirmação inválido ou expirado.",
      });
    }

    // 2. Verificar se token já foi utilizado — erro 409 e logar (NFR-7, REQ-14)
    if (token.isUsed()) {
      logger.error(
        {
          timestamp: new Date().toISOString(),
          tokenId: token.id,
          resultado: "link_ja_utilizado",
          requestId: crypto.randomUUID(),
        },
        "Link de confirmação já utilizado",
      );

      throw new ConfirmAccountUseCaseError({
        codigo: 409,
        mensagem: "Este link de confirmação já foi utilizado.",
      });
    }

    // 3. Verificar se token expirou — remover cadastro pendente, logar e erro 410 (REQ-12, NFR-7)
    if (token.isExpired()) {
      logger.error(
        {
          timestamp: new Date().toISOString(),
          tokenId: token.id,
          resultado: "link_expirado",
          requestId: crypto.randomUUID(),
        },
        "Link de confirmação expirado",
      );

      // Remover cadastro pendente (REQ-12)
      await userRepository.delete(token.userId);

      throw new ConfirmAccountUseCaseError({
        codigo: 410,
        mensagem: "Este link de confirmação expirou. Por favor, solicite um novo.",
      });
    }

    // 4. Marcar token como usado (REQ-10)
    await confirmationTokenRepository.markAsUsed(token.id);

    // 5. Ativar conta (REQ-10)
    await userRepository.activate(token.userId);

    // 6. Logar sucesso (NFR-7)
    logger.info(
      {
        timestamp: new Date().toISOString(),
        tokenId: token.id,
        resultado: "confirmacao_sucedida",
        requestId: crypto.randomUUID(),
      },
      "Conta ativada com sucesso",
    );

    return {
      message: "Sua conta foi ativada com sucesso! Você já pode fazer login.",
      loginUrl: `${appBaseUrl}/login`,
      registerUrl: `${appBaseUrl}/register`,
    };
  }
}

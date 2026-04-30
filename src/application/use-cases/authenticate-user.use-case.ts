// AuthenticateUserUseCase — camada application (Domain)
// Orquestra o fluxo de autenticacao: verificar bloqueio, buscar usuario,
// comparar senha, registrar tentativa, retornar dados da sessao.
// Sem dependencias de Drizzle, Next.js, next-auth ou React (constitution.md regras 13, 16, 18).
// Rastreabilidade: T-12 · T-32 · T-44 · REQ-2 · REQ-3 · REQ-8 · REQ-9 · REQ-12 · REQ-13 · NFR-3 · NFR-4 · NFR-7

import { randomUUID } from "crypto";
import type { LoginUserRepository } from "@/domain/ports/login-user-repository";
import type { PasswordVerifier } from "@/domain/ports/password-verifier";
import type { LoginAttemptRepository } from "@/domain/ports/login-attempt-repository";
import { LoginDomain } from "@/domain/entities/login-domain";
import type { EmailNotificationPort } from "@/domain/ports/email-notification.port";

// ─── Input / Output ────────────────────────────────────────────────────────

export interface AuthenticateUserInput {
  /** Username ou email submetido no formulario de login */
  identifier: string;
  /** Senha em texto simples fornecida pelo usuario */
  password: string;
  /** requestId gerado no adapter HTTP para rastreabilidade dos logs (NFR-7) */
  requestId: string;
}

/** Dados retornados ao next-auth authorize callback para criacao da sessao */
export interface AuthenticateUserOutput {
  id: string;
  username: string;
  email: string;
}

// ─── Erros tipados ─────────────────────────────────────────────────────────

/** Erro de autenticacao — credenciais invalidas (401) */
export class AuthenticationError extends Error {
  readonly codigo = 401;

  constructor() {
    super("Usuário ou senha incorretos");
    this.name = "AuthenticationError";
  }
}

/** Erro de bloqueio — identificador bloqueado por excesso de tentativas (429) */
export class AccountBlockedError extends Error {
  readonly codigo = 429;

  constructor() {
    super("Muitas tentativas fracassadas. Tente novamente em 15 minutos");
    this.name = "AccountBlockedError";
  }
}

// ─── Dependencias ──────────────────────────────────────────────────────────

export interface AuthenticateUserUseCaseDeps {
  userRepository: LoginUserRepository;
  passwordVerifier: PasswordVerifier;
  loginAttemptRepository: LoginAttemptRepository;
  /** Port de notificacao de email — opcional, fire-and-forget (REQ-14, NFR-8, DT-4) */
  emailNotificationPort?: EmailNotificationPort;
  /** Logger estruturado — deve aceitar objetos JSON (NFR-7, constitution.md regra 6) */
  logger: {
    info: (obj: object, msg?: string) => void;
    error: (obj: object, msg?: string) => void;
  };
}

// ─── Use Case ──────────────────────────────────────────────────────────────

/**
 * Orquestra o fluxo de autenticacao de usuario:
 * 1. Verifica se ha bloqueio ativo para o identificador (REQ-9, REQ-11)
 * 2. Busca o usuario pelo identificador (REQ-2)
 * 3. Verifica a senha com o hash armazenado (REQ-2, NFR-6)
 * 4. Registra a tentativa (bem-sucedida ou fracassada) (REQ-13, NFR-7)
 * 5. Retorna dados do usuario para criacao de sessao (REQ-3)
 *
 * Logica de ativacao de bloqueio apos 3 falhas: T-32 (REQ-8, REQ-9).
 * Logica de desbloqueio automatico: T-44 (REQ-12) — ja implementada no fluxo.
 * Envio de email de aviso: implementado em T-52 (REQ-14).
 */
export class AuthenticateUserUseCase {
  private readonly deps: AuthenticateUserUseCaseDeps;
  private readonly loginDomain = new LoginDomain();

  constructor(deps: AuthenticateUserUseCaseDeps) {
    this.deps = deps;
  }

  async execute(input: AuthenticateUserInput): Promise<AuthenticateUserOutput> {
    const { userRepository, passwordVerifier, loginAttemptRepository, emailNotificationPort, logger } = this.deps;
    const { identifier, password, requestId } = input;
    const now = new Date();

    // 1. Verificar bloqueio ativo (REQ-9, REQ-11)
    // findActiveBlock so retorna bloqueios com blocked_until > now.
    const activeBlock = await loginAttemptRepository.findActiveBlock(identifier);
    if (activeBlock !== null) {
      logger.info(
        {
          timestamp: now.toISOString(),
          requestId,
          identifier,
          success: false,
          tipoEvento: "login_bloqueado",
        },
        "Tentativa de login bloqueada",
      );
      throw new AccountBlockedError();
    }

    // Se havia bloqueio expirado, limpa (T-44, REQ-12)
    // findAnyBlock retorna qualquer bloqueio (ativo ou expirado).
    const anyBlock = await loginAttemptRepository.findAnyBlock(identifier);
    if (anyBlock !== null) {
      await loginAttemptRepository.removeBlock(identifier);
      await loginAttemptRepository.resetFailureCount(identifier);
    }

    // 2. Buscar usuario pelo identificador (REQ-2)
    const user = await userRepository.findByIdentifier(identifier);

    if (user === null) {
      // Usuario nao existe — registrar tentativa fracassada (REQ-13)
      await loginAttemptRepository.save({
        identifier,
        success: false,
        created_at: now,
      });

      logger.info(
        {
          timestamp: now.toISOString(),
          requestId,
          identifier,
          success: false,
          tipoEvento: "login_usuario_inexistente",
        },
        "Tentativa de login: usuario nao encontrado",
      );

      // Verificar se deve ativar bloqueio mesmo para identificador inexistente (REQ-8)
      const failureCountUnknown = await loginAttemptRepository.countRecentFailures(identifier, 10);
      if (this.loginDomain.shouldActivateBlock(failureCountUnknown)) {
        const blockedUntil = this.loginDomain.calculateBlockExpiration(now);
        await loginAttemptRepository.createBlock(identifier, blockedUntil);
        throw new AccountBlockedError();
      }

      throw new AuthenticationError();
    }

    // 3. Verificar senha (REQ-2, NFR-6)
    const passwordMatch = await passwordVerifier.verify(password, user.passwordHash);

    if (!passwordMatch) {
      // Senha incorreta — registrar tentativa fracassada (REQ-13)
      await loginAttemptRepository.save({
        identifier,
        success: false,
        created_at: now,
      });

      logger.info(
        {
          timestamp: now.toISOString(),
          requestId,
          identifier,
          success: false,
          tipoEvento: "login_senha_incorreta",
        },
        "Tentativa de login: senha incorreta",
      );

      // T-32: verificar contagem de falhas e ativar bloqueio se necessario (REQ-8, REQ-9)
      const failureCount = await loginAttemptRepository.countRecentFailures(identifier, 10);
      if (this.loginDomain.shouldActivateBlock(failureCount)) {
        const blockedUntil = this.loginDomain.calculateBlockExpiration(now);
        await loginAttemptRepository.createBlock(identifier, blockedUntil);

        logger.info(
          {
            timestamp: now.toISOString(),
            requestId,
            identifier,
            success: false,
            tipoEvento: "bloqueio_ativado",
            blockedUntil: blockedUntil.toISOString(),
          },
          "Bloqueio ativado apos excesso de tentativas",
        );

        throw new AccountBlockedError();
      }

      // T-52: envio fire-and-forget de email de aviso quando conta existe e senha incorreta (REQ-14, NFR-8, DT-4)
      if (this.loginDomain.shouldSendEmailWarning(true, false) && emailNotificationPort) {
        emailNotificationPort.sendLoginWarning(user.email).catch((err: unknown) => {
          // Falha no envio de email: logar mas nao propagar — nao bloqueia resposta HTTP (DT-4)
          logger.error(
            {
              timestamp: now.toISOString(),
              requestId,
              identifier,
              tipoEvento: "falha_envio_email_aviso",
              erro: err instanceof Error ? err.message : String(err),
            },
            "Falha ao enviar email de aviso de login",
          );
        });
      }

      throw new AuthenticationError();
    }

    // 4. Registrar tentativa bem-sucedida (REQ-13, NFR-7)
    await loginAttemptRepository.save({
      identifier,
      success: true,
      created_at: now,
    });

    // 5. Emitir log estruturado (REQ-13, NFR-7, constitution.md regra 6)
    logger.info(
      {
        timestamp: now.toISOString(),
        requestId,
        identifier,
        success: true,
        tipoEvento: "login_sucesso",
      },
      "Autenticacao bem-sucedida",
    );

    // 6. Retornar dados para criacao de sessao next-auth (REQ-3)
    return {
      id: user.id,
      username: user.username,
      email: user.email,
    };
  }
}

/**
 * Gera um requestId unico para rastreabilidade de logs quando nenhum e fornecido.
 */
export function generateRequestId(): string {
  return randomUUID();
}

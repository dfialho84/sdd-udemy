// RegisterUserUseCase — camada application
// Rastreabilidade: REQ-3 · REQ-7 · REQ-8 · REQ-9 · NFR-6 · T-06

import { randomUUID } from "crypto";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { TokenGenerator } from "@/domain/ports/token-generator";
import type { EmailService } from "@/domain/ports/email-service";
import type { ConfirmationTokenRepository } from "@/domain/ports/confirmation-token-repository";

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
  birthDate: Date;
  /** Object key do MinIO (`avatars/<uuid>.<ext>`) ou null quando não há avatar. */
  avatarKey?: string | null;
  /** requestId gerado no adapter HTTP para rastreabilidade dos logs (NFR-6) */
  requestId: string;
}

export interface RegisterUserOutput {
  message: string;
}

/** Estrutura de erro padronizada (constitution.md, regra 5) */
export interface DomainError {
  codigo: number;
  mensagem: string;
}

export class RegisterUserUseCaseError extends Error {
  readonly codigo: number;

  constructor({ codigo, mensagem }: DomainError) {
    super(mensagem);
    this.name = "RegisterUserUseCaseError";
    this.codigo = codigo;
  }
}

export interface RegisterUserUseCaseDeps {
  userRepository: UserRepository;
  passwordHasher: PasswordHasher;
  tokenGenerator: TokenGenerator;
  emailService: EmailService;
  confirmationTokenRepository: ConfirmationTokenRepository;
  /** Base URL do sistema para compor o link de confirmação (ex: https://app.example.com) */
  appBaseUrl: string;
  /** Logger estruturado — deve aceitar objetos JSON (NFR-6) */
  logger: { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };
}

/**
 * Orquestra o fluxo de registro de usuário:
 * 1. Verifica unicidade do email (REQ-3)
 * 2. Gera hash argon2id da senha (NFR-2)
 * 3. Cria o usuário com status 'pending' (REQ-8)
 * 4. Gera e persiste token de confirmação com validade de 24h (REQ-9)
 * 5. Envia email com link de confirmação (REQ-9)
 * 6. Emite log estruturado JSON (NFR-6)
 */
export class RegisterUserUseCase {
  private readonly deps: RegisterUserUseCaseDeps;

  constructor(deps: RegisterUserUseCaseDeps) {
    this.deps = deps;
  }

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const {
      userRepository,
      passwordHasher,
      tokenGenerator,
      emailService,
      confirmationTokenRepository,
      appBaseUrl,
      logger,
    } = this.deps;

    const { name, email, password, birthDate, avatarKey, requestId } = input;

    // 1. Verificar unicidade do email (REQ-3)
    const existing = await userRepository.findByEmail(email);
    if (existing !== null) {
      throw new RegisterUserUseCaseError({
        codigo: 409,
        mensagem: "Este email já está cadastrado. Tente fazer login ou use outro endereço.",
      });
    }

    // 2. Gerar hash argon2id da senha (NFR-2)
    const passwordHash = await passwordHasher.hash(password);

    // 3. Criar o usuário com status 'pending' (REQ-8)
    const userId = randomUUID();
    const user = await userRepository.create({
      id: userId,
      name,
      email,
      passwordHash,
      birthDate,
      avatarKey: avatarKey ?? null,
      status: "pending",
    });

    // 4. Gerar e persistir token de confirmação com validade de 24h (REQ-9)
    const tokenValue = tokenGenerator.generate();
    const tokenId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 horas

    await confirmationTokenRepository.create({
      id: tokenId,
      userId: user.id,
      token: tokenValue,
      expiresAt,
      usedAt: null,
    });

    // 5. Enviar email com link de confirmação (REQ-9)
    const confirmationUrl = `${appBaseUrl}/api/auth/confirm?token=${tokenValue}`;
    try {
      await emailService.send({
        to: email,
        subject: "Confirme seu cadastro",
        confirmationUrl,
      });
    } catch (err) {
      // Falha de envio de email: logar e não propagar — conta permanece pending (NFR-6)
      const maskedEmail = maskEmail(email);
      logger.error(
        {
          timestamp: new Date().toISOString(),
          requestId,
          email: maskedEmail,
          tipoEvento: "falha_envio_email",
          motivoFalha: err instanceof Error ? err.message : String(err),
        },
        "Falha ao enviar email de confirmação",
      );
    }

    // 6. Log estruturado de criação de cadastro (NFR-6)
    logger.info(
      {
        timestamp: new Date().toISOString(),
        requestId,
        email: maskEmail(email),
        tipoEvento: "cadastro_criado",
      },
      "Cadastro criado com status pending",
    );

    return { message: "Um link de confirmacao foi enviado ao seu email." };
  }
}

/**
 * Mascara parcialmente o email para logs (NFR-6).
 * Exemplo: "usuario@dominio.com" → "usu***@dominio.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  const visible = local.slice(0, 3);
  return `${visible}***@${domain}`;
}

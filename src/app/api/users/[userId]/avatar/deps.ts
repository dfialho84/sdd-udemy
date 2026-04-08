// Fábrica de dependências do AvatarAccessHandler —
// separada do route.ts para evitar conflito com as restrições de exportação do Next.js App Router.
// Rastreabilidade: T-74 · NFR-13 · DT-9

import { DrizzleUserRepository } from "@/adapters/outbound/persistence/drizzle-user-repository";
import { MinioAvatarStorageAdapter } from "@/adapters/outbound/storage/minio-avatar-storage.adapter";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { AvatarAccessPort } from "@/domain/ports/avatar-access.port";
import { logger as defaultLogger } from "@/lib/observability/logger";

/** Dependências do AvatarAccessHandler */
export interface AvatarAccessHandlerDeps {
  userRepository: UserRepository;
  avatarAccessPort: AvatarAccessPort;
  logger: { info: (obj: object, msg?: string) => void; error: (obj: object, msg?: string) => void };
}

/**
 * Monta as dependências concretas do AvatarAccessHandler para uso em produção.
 */
export function buildAvatarAccessDeps(): AvatarAccessHandlerDeps {
  return {
    userRepository: new DrizzleUserRepository(),
    avatarAccessPort: new MinioAvatarStorageAdapter(),
    logger: defaultLogger,
  };
}

/**
 * Fábrica de dependências substituível em testes de integração.
 */
let depsFactory: () => AvatarAccessHandlerDeps = buildAvatarAccessDeps;

/** Substitui a fábrica de dependências — use apenas em testes. */
export function setAvatarAccessDepsFactory(factory: () => AvatarAccessHandlerDeps): void {
  depsFactory = factory;
}

/** Restaura a fábrica padrão. */
export function resetAvatarAccessDepsFactory(): void {
  depsFactory = buildAvatarAccessDeps;
}

/** Retorna a fábrica atual de dependências. */
export function getAvatarAccessDepsFactory(): () => AvatarAccessHandlerDeps {
  return depsFactory;
}

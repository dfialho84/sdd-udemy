// Port outbound — LoginUserRepository
// Interface do Domain para busca de usuario durante o fluxo de autenticacao.
// Segue ISP (constitution.md regra 8): interface minima com apenas o metodo
// necessario para o AuthenticateUserUseCase, sem herdar metodos de registrar-usuario.
// Sem importacoes de Drizzle, Next.js ou React (constitution.md regras 13, 16).
// Rastreabilidade: T-08 · REQ-2

import type { LoginUser } from "@/domain/entities/login-user";

export interface LoginUserRepository {
  /**
   * Busca um usuario ativo pelo identificador.
   * O identificador pode ser username (campo name da tabela users) ou email.
   * Retorna null se o usuario nao existir ou tiver status diferente de 'active'.
   *
   * @param identifier - username ou email do usuario
   * @returns LoginUser com status active, ou null se nao encontrado/inativo
   */
  findByIdentifier(identifier: string): Promise<LoginUser | null>;
}

// Port outbound — UserRepository
// Rastreabilidade: REQ-3 · REQ-7 · REQ-8 · REQ-10 · REQ-12 · T-05 · T-85

import type { User } from "../entities/user";
import type { UserProps } from "../entities/user";

export type CreateUserInput = Omit<UserProps, "createdAt" | "updatedAt">;

export interface UserRepository {
  /**
   * Persiste um novo usuário.
   * Retorna o User criado com createdAt e updatedAt preenchidos pelo repositório.
   * Lança erro com código de constraint UNIQUE se o email já existir.
   */
  create(input: CreateUserInput): Promise<User>;

  /**
   * Retorna o User cujo username corresponde ao argumento, ou null se não encontrado.
   * Utilizado para verificar unicidade de username antes de criar um novo usuário (REQ-7, DT-10).
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Retorna o User cujo email corresponde ao argumento, ou null se não encontrado.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Retorna o User cujo id corresponde ao argumento, ou null se não encontrado.
   */
  findById(id: string): Promise<User | null>;

  /**
   * Remove o usuário com o id fornecido.
   * Utilizado quando o token de confirmação expira (REQ-12).
   */
  delete(id: string): Promise<void>;

  /**
   * Atualiza o status do usuário para 'active'.
   * Utilizado após confirmação bem-sucedida do token (REQ-10).
   */
  activate(id: string): Promise<void>;

  /**
   * Atualiza o password_hash do usuário.
   * Utilizado apos redefinicao de senha bem-sucedida (REQ-10).
   * Rastreabilidade: REQ-10 · T-12
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>;

  /**
   * Invalida todas as sessoes ativas do usuario.
   * Utilizado apos redefinicao de senha (REQ-10).
   * Rastreabilidade: REQ-10 · T-12
   */
  invalidateAllSessions(userId: string): Promise<void>;
}

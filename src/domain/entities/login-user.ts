// Tipo LoginUser — entidade de dominio para a feature login
// Representa os dados do usuario necessarios para autenticacao.
// Sem dependencias de Drizzle, Next.js ou React (constitution.md regras 13, 16).
// Rastreabilidade: T-07 · REQ-2

/**
 * Status do usuario — apenas usuarios com status 'active' podem autenticar (REQ-2).
 * Reutiliza o mesmo enum da entidade User de registrar-usuario.
 */
export type UserStatus = "active" | "pending";

/**
 * Subconjunto dos dados do usuario necessarios para o fluxo de autenticacao.
 * Mapeia para a tabela `users` do banco:
 *   - id           → id (UUID)
 *   - username     → name (campo name da tabela users)
 *   - email        → email
 *   - passwordHash → password_hash
 *   - status       → status ('active' | 'pending')
 *
 * Apenas usuarios com status 'active' podem autenticar.
 */
export interface LoginUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
}

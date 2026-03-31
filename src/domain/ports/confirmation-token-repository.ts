// Port outbound — ConfirmationTokenRepository
// Rastreabilidade: REQ-9 · REQ-14 · REQ-15 · NFR-3 · T-06

import type { ConfirmationToken, ConfirmationTokenProps } from "../entities/confirmation-token";

export type CreateConfirmationTokenInput = Omit<ConfirmationTokenProps, "createdAt">;

export interface ConfirmationTokenRepository {
  /**
   * Persiste um novo token de confirmação.
   * Retorna o ConfirmationToken criado com createdAt preenchido pelo repositório.
   */
  create(input: CreateConfirmationTokenInput): Promise<ConfirmationToken>;

  /**
   * Retorna o ConfirmationToken cujo valor de token corresponde ao argumento,
   * ou null se não encontrado.
   */
  findByToken(token: string): Promise<ConfirmationToken | null>;

  /**
   * Marca o token como utilizado preenchendo used_at com o instante atual.
   * Rastreabilidade: REQ-14 · NFR-3
   */
  markAsUsed(tokenId: string): Promise<void>;
}

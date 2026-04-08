// Port outbound — AvatarAccessPort
// Rastreabilidade: REQ-2 · NFR-13 · DT-9 · T-73

/**
 * Interface de acesso temporário a avatares armazenados.
 * Abstrai o mecanismo de geração de URLs pré-assinadas (presigned URLs) do
 * adapter concreto (MinIO, S3, etc.).
 *
 * O Domain e os casos de uso nunca importam implementações concretas de storage.
 */
export interface AvatarAccessPort {
  /**
   * Gera uma URL temporária de download para o objeto identificado por avatarKey.
   *
   * @param avatarKey       - Object key no formato `avatars/<uuid>.<ext>`
   * @param expiresInSeconds - Tempo de validade da URL em segundos
   * @returns URL temporária como string
   * @throws Propaga qualquer exceção do SDK ao chamador (sem silenciar)
   */
  getPresignedUrl(avatarKey: string, expiresInSeconds: number): Promise<string>;
}

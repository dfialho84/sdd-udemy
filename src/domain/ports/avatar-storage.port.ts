// Port outbound — AvatarStoragePort
// Rastreabilidade: REQ-1 · DT-6 · T-56

/**
 * Interface de armazenamento de avatar.
 * Abstrai o meio de persistência (filesystem, cloud) do adapter HTTP inbound.
 * O Domain e os casos de uso nunca importam implementações concretas de armazenamento.
 */
export interface AvatarStoragePort {
  /**
   * Persiste o buffer de imagem e retorna o caminho relativo para acesso público.
   *
   * @param buffer  - Bytes do arquivo de imagem
   * @param mimeType - Tipo MIME declarado pelo cliente (ex: "image/jpeg")
   * @returns Caminho relativo no formato "/uploads/avatars/<uuid>.<ext>"
   * @throws Propaga qualquer exceção de escrita ao chamador (sem silenciar)
   */
  save(buffer: Buffer, mimeType: string): Promise<string>;
}

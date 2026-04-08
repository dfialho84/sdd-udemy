// MinioAvatarStorageAdapter — adapter outbound concreto de AvatarStoragePort e AvatarAccessPort
// Rastreabilidade: REQ-2 · NFR-13 · DT-6 · DT-9 · T-62

import { randomUUID } from "crypto";
import { Client as MinioClient } from "minio";
import type { AvatarStoragePort } from "@/domain/ports/avatar-storage.port";
import type { AvatarAccessPort } from "@/domain/ports/avatar-access.port";

/** Mapeamento de tipo MIME → extensão de arquivo */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * Adapter outbound que persiste avatares no MinIO e gera presigned URLs para acesso.
 *
 * Implementa AvatarStoragePort (upload) e AvatarAccessPort (download temporário).
 * Toda configuração é lida de variáveis de ambiente — nunca hardcoded.
 *
 * Rastreabilidade: REQ-2 · DT-6 · DT-9
 */
export class MinioAvatarStorageAdapter implements AvatarStoragePort, AvatarAccessPort {
  private readonly client: MinioClient;
  private readonly bucket: string;

  constructor(client?: MinioClient, bucket?: string) {
    // Permite injeção de client mockado em testes unitários.
    // Em produção usa as variáveis de ambiente.
    this.client =
      client ??
      new MinioClient({
        endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
        port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
        useSSL: (process.env.MINIO_USE_SSL ?? "false") === "true",
        accessKey: process.env.MINIO_ACCESS_KEY ?? "",
        secretKey: process.env.MINIO_SECRET_KEY ?? "",
      });

    this.bucket = bucket ?? process.env.MINIO_BUCKET ?? "avatars";
  }

  /**
   * Faz upload do buffer de imagem para o MinIO e retorna a object key.
   *
   * @param buffer   - Bytes do arquivo de imagem
   * @param mimeType - Tipo MIME (ex: "image/jpeg", "image/png", "image/webp")
   * @returns Object key no formato `avatars/<uuid>.<ext>`
   * @throws Propaga qualquer exceção do SDK ao chamador (constitution.md regra 15)
   */
  async save(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = MIME_TO_EXT[mimeType];
    if (!ext) {
      throw new Error(`Tipo MIME não suportado: ${mimeType}`);
    }

    const objectKey = `avatars/${randomUUID()}${ext}`;

    // Propaga exceções do SDK ao chamador — sem silenciar (constitution.md regra 15)
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      "Content-Type": mimeType,
    });

    return objectKey;
  }

  /**
   * Gera uma presigned URL temporária de download para o objeto.
   *
   * @param avatarKey       - Object key no formato `avatars/<uuid>.<ext>`
   * @param expiresInSeconds - Tempo de validade em segundos
   * @returns URL temporária como string
   * @throws Propaga qualquer exceção do SDK ao chamador (constitution.md regra 15)
   */
  async getPresignedUrl(avatarKey: string, expiresInSeconds: number): Promise<string> {
    // Propaga exceções do SDK ao chamador — sem silenciar (constitution.md regra 15)
    return this.client.presignedGetObject(this.bucket, avatarKey, expiresInSeconds);
  }
}

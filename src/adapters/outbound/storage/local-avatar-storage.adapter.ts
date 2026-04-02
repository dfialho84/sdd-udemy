// LocalAvatarStorageAdapter — adapter outbound concreto de AvatarStoragePort
// Rastreabilidade: REQ-1 · DT-6 · T-57

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AvatarStoragePort } from "@/domain/ports/avatar-storage.port";

/** Mapeamento de tipo MIME para extensão de arquivo */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

/**
 * Adapter outbound que persiste arquivos de avatar no filesystem local.
 * Grava em `public/uploads/avatars/<uuid>.<ext>` e retorna o caminho relativo.
 *
 * Rastreabilidade: REQ-1 · DT-6
 */
export class LocalAvatarStorageAdapter implements AvatarStoragePort {
  /** Diretório base absoluto onde os arquivos serão gravados */
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    // Por padrão usa public/uploads/avatars/ relativo à raiz do projeto.
    // Permite sobrescrever em testes para usar diretório temporário isolado.
    this.baseDir =
      baseDir ?? path.join(process.cwd(), "public", "uploads", "avatars");
  }

  /**
   * Persiste o buffer de imagem no diretório local e retorna o caminho relativo.
   *
   * @param buffer   - Bytes do arquivo de imagem
   * @param mimeType - Tipo MIME (ex: "image/jpeg", "image/png", "image/webp")
   * @returns Caminho relativo no formato "/uploads/avatars/<uuid>.<ext>"
   * @throws Propaga qualquer exceção de escrita ao chamador (constitution.md regra 15)
   */
  async save(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = MIME_TO_EXT[mimeType];
    if (!ext) {
      throw new Error(`Tipo MIME não suportado: ${mimeType}`);
    }

    // Garantir que o diretório de destino existe (cria recursivamente se necessário)
    fs.mkdirSync(this.baseDir, { recursive: true });

    const filename = `${randomUUID()}${ext}`;
    const absolutePath = path.join(this.baseDir, filename);

    // Grava o buffer — propaga qualquer exceção de I/O ao chamador
    fs.writeFileSync(absolutePath, buffer);

    return `/uploads/avatars/${filename}`;
  }
}

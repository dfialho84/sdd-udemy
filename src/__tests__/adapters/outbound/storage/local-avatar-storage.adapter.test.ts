// Testes unitários UT-7 — LocalAvatarStorageAdapter.save() com filesystem mockado
// Rastreabilidade: REQ-1 · DT-6 · T-58
//
// Usa jest.mock("fs") para evitar qualquer gravação em disco real.
// Cobre os 5 casos especificados em UT-7:
//   (a) JPEG → extensão .jpg e caminho /uploads/avatars/<uuid>.jpg
//   (b) PNG  → extensão .png
//   (c) WebP → extensão .webp
//   (d) Duas chamadas consecutivas geram nomes de arquivo distintos
//   (e) Falha de escrita propaga exceção ao chamador

import fs from "fs";
import { LocalAvatarStorageAdapter } from "@/adapters/outbound/storage/local-avatar-storage.adapter";

// Mock do módulo fs — impede qualquer I/O real em disco
jest.mock("fs");

const mockWriteFileSync = jest.mocked(fs.writeFileSync);
const mockMkdirSync = jest.mocked(fs.mkdirSync);

describe("UT-7: LocalAvatarStorageAdapter — save()", () => {
  const baseDir = "/tmp/test-avatars";
  let adapter: LocalAvatarStorageAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    // Configura mocks para não lançar exceção por padrão
    mockMkdirSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);
    adapter = new LocalAvatarStorageAdapter(baseDir);
  });

  // UT-7a: buffer JPEG gravado com extensão .jpg
  it("(a) salva buffer JPEG com extensão .jpg e retorna caminho relativo correto", async () => {
    const buffer = Buffer.from("fake-jpeg-bytes");
    const result = await adapter.save(buffer, "image/jpeg");

    // Caminho deve ter formato /uploads/avatars/<uuid>.jpg
    expect(result).toMatch(/^\/uploads\/avatars\/[0-9a-f-]{36}\.jpg$/);

    // Verifica que writeFileSync foi chamado com o buffer correto
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const [calledPath, calledBuffer] = mockWriteFileSync.mock.calls[0]!;
    expect(calledPath).toContain(".jpg");
    expect(calledBuffer).toBe(buffer);
  });

  // UT-7b: buffer PNG gravado com extensão .png
  it("(b) salva buffer PNG com extensão .png", async () => {
    const buffer = Buffer.from("fake-png-bytes");
    const result = await adapter.save(buffer, "image/png");

    expect(result).toMatch(/^\/uploads\/avatars\/[0-9a-f-]{36}\.png$/);
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const [calledPath] = mockWriteFileSync.mock.calls[0]!;
    expect(calledPath).toContain(".png");
  });

  // UT-7c: buffer WebP gravado com extensão .webp
  it("(c) salva buffer WebP com extensão .webp", async () => {
    const buffer = Buffer.from("fake-webp-bytes");
    const result = await adapter.save(buffer, "image/webp");

    expect(result).toMatch(/^\/uploads\/avatars\/[0-9a-f-]{36}\.webp$/);
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    const [calledPath] = mockWriteFileSync.mock.calls[0]!;
    expect(calledPath).toContain(".webp");
  });

  // UT-7d: duas chamadas consecutivas geram nomes de arquivo distintos
  it("(d) duas chamadas consecutivas geram nomes de arquivo distintos", async () => {
    const buffer = Buffer.from("bytes");

    const result1 = await adapter.save(buffer, "image/jpeg");
    const result2 = await adapter.save(buffer, "image/jpeg");

    expect(result1).not.toEqual(result2);

    // Extrai os UUIDs dos caminhos e verifica que são distintos
    const uuid1 = result1.replace("/uploads/avatars/", "").replace(".jpg", "");
    const uuid2 = result2.replace("/uploads/avatars/", "").replace(".jpg", "");
    expect(uuid1).not.toEqual(uuid2);
  });

  // UT-7e: falha de escrita no filesystem propaga exceção ao chamador
  it("(e) falha de escrita no filesystem propaga exceção ao chamador", async () => {
    const ioError = new Error("EACCES: permission denied");
    mockWriteFileSync.mockImplementation(() => {
      throw ioError;
    });

    const buffer = Buffer.from("fake-bytes");

    await expect(adapter.save(buffer, "image/jpeg")).rejects.toThrow(
      "EACCES: permission denied",
    );
  });

  // Verifica que mkdirSync é chamado para garantir o diretório existe
  it("garante que o diretório de destino é criado antes de gravar", async () => {
    const buffer = Buffer.from("bytes");
    await adapter.save(buffer, "image/png");

    expect(mockMkdirSync).toHaveBeenCalledWith(baseDir, { recursive: true });
  });
});

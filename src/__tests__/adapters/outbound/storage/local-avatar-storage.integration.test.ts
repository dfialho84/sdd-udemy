// Teste de integração IT-5 — LocalAvatarStorageAdapter.save() com filesystem real
// Rastreabilidade: REQ-1 · DT-6 · T-59
//
// Usa um diretório temporário isolado (os.tmpdir()) para evitar poluição de public/.
// Limpa todos os arquivos gravados após cada caso de teste.
//
// Casos cobertos:
//   (a) Buffer JPEG gravado em disco; arquivo existe no caminho retornado; caminho com /uploads/avatars/<uuid>.jpg
//   (b) PNG e WebP: extensões derivadas corretamente
//   (c) Diretório de destino criado automaticamente se não existir

import fs from "fs";
import os from "os";
import path from "path";
import { LocalAvatarStorageAdapter } from "@/adapters/outbound/storage/local-avatar-storage.adapter";

describe("IT-5: LocalAvatarStorageAdapter — save() com filesystem real", () => {
  let testBaseDir: string;
  let adapter: LocalAvatarStorageAdapter;

  beforeEach(() => {
    // Cria um diretório temporário único por execução de teste
    testBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "avatar-test-"));
    adapter = new LocalAvatarStorageAdapter(testBaseDir);
  });

  afterEach(() => {
    // Remove o diretório temporário e todos os arquivos gravados
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  });

  // IT-5a: buffer JPEG gravado em disco com formato e extensão corretos
  it("(a) salva buffer JPEG em disco; arquivo existe no caminho retornado com formato /uploads/avatars/<uuid>.jpg", async () => {
    const buffer = Buffer.from("fake-jpeg-bytes");
    const relativePath = await adapter.save(buffer, "image/jpeg");

    // Caminho relativo tem o formato correto
    expect(relativePath).toMatch(/^\/uploads\/avatars\/[0-9a-f-]{36}\.jpg$/);

    // Arquivo existe fisicamente no disco
    const filename = path.basename(relativePath);
    const absolutePath = path.join(testBaseDir, filename);
    expect(fs.existsSync(absolutePath)).toBe(true);

    // Conteúdo gravado corresponde ao buffer original
    const savedContent = fs.readFileSync(absolutePath);
    expect(savedContent).toEqual(buffer);
  });

  // IT-5b: PNG e WebP têm extensões derivadas corretamente
  it("(b) PNG e WebP: extensões derivadas corretamente do mimeType", async () => {
    const pngBuffer = Buffer.from("fake-png-bytes");
    const webpBuffer = Buffer.from("fake-webp-bytes");

    const pngPath = await adapter.save(pngBuffer, "image/png");
    const webpPath = await adapter.save(webpBuffer, "image/webp");

    expect(pngPath).toMatch(/\.png$/);
    expect(webpPath).toMatch(/\.webp$/);

    // Arquivos existem em disco
    const pngFilename = path.basename(pngPath);
    const webpFilename = path.basename(webpPath);
    expect(fs.existsSync(path.join(testBaseDir, pngFilename))).toBe(true);
    expect(fs.existsSync(path.join(testBaseDir, webpFilename))).toBe(true);
  });

  // IT-5c: diretório criado automaticamente se não existir
  it("(c) cria diretório de destino automaticamente se não existir", async () => {
    // Remove o diretório para simular ausência
    fs.rmSync(testBaseDir, { recursive: true, force: true });
    expect(fs.existsSync(testBaseDir)).toBe(false);

    const buffer = Buffer.from("fake-bytes");
    const relativePath = await adapter.save(buffer, "image/jpeg");

    // Após save(), o diretório foi criado e o arquivo existe
    expect(fs.existsSync(testBaseDir)).toBe(true);
    const filename = path.basename(relativePath);
    expect(fs.existsSync(path.join(testBaseDir, filename))).toBe(true);
  });
});

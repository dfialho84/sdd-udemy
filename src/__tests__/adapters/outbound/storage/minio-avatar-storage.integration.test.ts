// Teste de integração IT-5 — MinioAvatarStorageAdapter com MinIO real
// Rastreabilidade: REQ-2 · DT-6 · T-64
//
// Cobre:
// (a) buffer JPEG enviado ao MinIO: objeto existe no bucket com a key retornada; key no formato avatars/<uuid>.jpg
// (b) PNG e WebP com extensões derivadas corretamente para cada mimeType
// (c) bucket inexistente lança exceção descritiva ao chamador
//
// Pré-requisitos:
//   - MinIO rodando via Docker Compose (kanban_minio)
//   - Variáveis de ambiente: MINIO_ENDPOINT, MINIO_PORT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
//   - Um bucket de teste será criado/destruído durante os testes

import { Client as MinioClient } from "minio";
import { MinioAvatarStorageAdapter } from "@/adapters/outbound/storage/minio-avatar-storage.adapter";

const TEST_BUCKET = "it5-avatar-test";

// Configuração do cliente MinIO de teste — lê das variáveis de ambiente com fallback para o Docker Compose padrão
const testClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
  port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
  useSSL: (process.env.MINIO_USE_SSL ?? "false") === "true",
  accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
});

// Rastreia os objetos criados durante os testes para limpeza
const createdKeys: string[] = [];

beforeAll(async () => {
  // Cria o bucket de teste se não existir
  const exists = await testClient.bucketExists(TEST_BUCKET);
  if (!exists) {
    await testClient.makeBucket(TEST_BUCKET);
  }
});

afterEach(async () => {
  // Remove todos os objetos criados neste teste para não poluir o ambiente
  for (const key of createdKeys) {
    try {
      await testClient.removeObject(TEST_BUCKET, key);
    } catch {
      // ignora erros de remoção — o objeto pode não existir se o teste falhou antes de criá-lo
    }
  }
  createdKeys.length = 0;
});

afterAll(async () => {
  // Remove o bucket de teste ao finalizar a suíte
  try {
    await testClient.removeBucket(TEST_BUCKET);
  } catch {
    // ignora — bucket pode não existir
  }
});

describe("IT-5: MinioAvatarStorageAdapter — save() com MinIO real", () => {
  // (a) JPEG: objeto existe no bucket com a key retornada; key no formato avatars/<uuid>.jpg
  it("(a) JPEG: faz upload do buffer e retorna object key no formato avatars/<uuid>.jpg", async () => {
    const adapter = new MinioAvatarStorageAdapter(testClient, TEST_BUCKET);
    const buffer = Buffer.from("fake-jpeg-data-for-integration-test");

    const objectKey = await adapter.save(buffer, "image/jpeg");

    // Registra para limpeza posterior
    createdKeys.push(objectKey);

    // Verifica o formato da key
    expect(objectKey).toMatch(/^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/);

    // Verifica que o objeto existe no bucket com o tamanho correto
    const stat = await testClient.statObject(TEST_BUCKET, objectKey);
    expect(stat.size).toBe(buffer.length);
  });

  // (b) PNG: extensão .png derivada corretamente
  it("(b) PNG: extensão .png derivada corretamente; objeto existe no bucket com a key retornada", async () => {
    const adapter = new MinioAvatarStorageAdapter(testClient, TEST_BUCKET);
    const buffer = Buffer.from("fake-png-data-for-integration-test");

    const objectKey = await adapter.save(buffer, "image/png");
    createdKeys.push(objectKey);

    expect(objectKey).toMatch(/^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/);

    const stat = await testClient.statObject(TEST_BUCKET, objectKey);
    expect(stat.size).toBe(buffer.length);
  });

  // (b) WebP: extensão .webp derivada corretamente
  it("(b) WebP: extensão .webp derivada corretamente; objeto existe no bucket com a key retornada", async () => {
    const adapter = new MinioAvatarStorageAdapter(testClient, TEST_BUCKET);
    const buffer = Buffer.from("fake-webp-data-for-integration-test");

    const objectKey = await adapter.save(buffer, "image/webp");
    createdKeys.push(objectKey);

    expect(objectKey).toMatch(/^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/);

    const stat = await testClient.statObject(TEST_BUCKET, objectKey);
    expect(stat.size).toBe(buffer.length);
  });

  // (c) Bucket inexistente lança exceção descritiva ao chamador
  it("(c) bucket inexistente lança exceção ao chamador", async () => {
    const adapter = new MinioAvatarStorageAdapter(testClient, "bucket-que-nao-existe-it5");
    const buffer = Buffer.from("fake-data");

    await expect(adapter.save(buffer, "image/jpeg")).rejects.toThrow();
  });
});

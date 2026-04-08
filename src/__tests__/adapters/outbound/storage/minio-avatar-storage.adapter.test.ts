// Testes unitários UT-7 — MinioAvatarStorageAdapter
// Rastreabilidade: REQ-2 · DT-6 · T-63
//
// Cobre:
// (a) JPEG → putObject chamado com bucket, object key avatars/<uuid>.jpg e content-type image/jpeg; retorna a key
// (b) PNG → extensão .png derivada corretamente
// (c) WebP → extensão .webp derivada corretamente
// (d) Duas chamadas consecutivas geram object keys distintas (UUID único por chamada)
// (e) Falha de putObject é propagada ao chamador
//
// SDK MinIO é mockado — nenhuma instância real é necessária.

import { MinioAvatarStorageAdapter } from "@/adapters/outbound/storage/minio-avatar-storage.adapter";
import type { Client as MinioClient } from "minio";

// --- Helper: constrói um mock do MinioClient ---

function makeMockClient(overrides: Partial<MinioClient> = {}): MinioClient {
  return {
    putObject: jest.fn().mockResolvedValue({ etag: "mock-etag", versionId: null }),
    presignedGetObject: jest.fn().mockResolvedValue("https://minio.example.com/avatars/mock.jpg?sig=abc"),
    ...overrides,
  } as unknown as MinioClient;
}

const TEST_BUCKET = "test-bucket";

// Regex para validar object key no formato esperado
const KEY_JPEG_RE = /^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;
const KEY_PNG_RE  = /^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/;
const KEY_WEBP_RE = /^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

describe("UT-7: MinioAvatarStorageAdapter.save()", () => {
  // (a) Buffer JPEG — extensão .jpg, putObject com parâmetros corretos
  it("(a) JPEG: chama putObject com bucket, object key avatars/<uuid>.jpg e content-type image/jpeg; retorna a key", async () => {
    const mockClient = makeMockClient();
    const adapter = new MinioAvatarStorageAdapter(mockClient, TEST_BUCKET);

    const buffer = Buffer.from("fake-jpeg-bytes");
    const result = await adapter.save(buffer, "image/jpeg");

    // Verifica formato da object key retornada
    expect(result).toMatch(KEY_JPEG_RE);

    // Verifica que putObject foi chamado com os parâmetros corretos
    expect(mockClient.putObject).toHaveBeenCalledTimes(1);
    expect(mockClient.putObject).toHaveBeenCalledWith(
      TEST_BUCKET,
      result,            // a key retornada deve ser a mesma passada ao putObject
      buffer,
      buffer.length,
      { "Content-Type": "image/jpeg" },
    );
  });

  // (b) PNG → extensão .png derivada corretamente
  it("(b) PNG: extensão .png derivada corretamente; object key retornada termina em .png", async () => {
    const mockClient = makeMockClient();
    const adapter = new MinioAvatarStorageAdapter(mockClient, TEST_BUCKET);

    const buffer = Buffer.from("fake-png-bytes");
    const result = await adapter.save(buffer, "image/png");

    expect(result).toMatch(KEY_PNG_RE);
    expect(mockClient.putObject).toHaveBeenCalledWith(
      TEST_BUCKET,
      result,
      buffer,
      buffer.length,
      { "Content-Type": "image/png" },
    );
  });

  // (c) WebP → extensão .webp derivada corretamente
  it("(c) WebP: extensão .webp derivada corretamente; object key retornada termina em .webp", async () => {
    const mockClient = makeMockClient();
    const adapter = new MinioAvatarStorageAdapter(mockClient, TEST_BUCKET);

    const buffer = Buffer.from("fake-webp-bytes");
    const result = await adapter.save(buffer, "image/webp");

    expect(result).toMatch(KEY_WEBP_RE);
    expect(mockClient.putObject).toHaveBeenCalledWith(
      TEST_BUCKET,
      result,
      buffer,
      buffer.length,
      { "Content-Type": "image/webp" },
    );
  });

  // (d) Duas chamadas consecutivas geram object keys distintas
  it("(d) Duas chamadas consecutivas geram object keys distintas (UUID único por chamada)", async () => {
    const mockClient = makeMockClient();
    const adapter = new MinioAvatarStorageAdapter(mockClient, TEST_BUCKET);

    const buffer = Buffer.from("fake-bytes");
    const key1 = await adapter.save(buffer, "image/jpeg");
    const key2 = await adapter.save(buffer, "image/jpeg");

    expect(key1).not.toBe(key2);
    expect(key1).toMatch(KEY_JPEG_RE);
    expect(key2).toMatch(KEY_JPEG_RE);
    expect(mockClient.putObject).toHaveBeenCalledTimes(2);
  });

  // (e) Falha de putObject é propagada ao chamador
  it("(e) Falha de conexão com MinIO (putObject lança exceção) é propagada ao chamador", async () => {
    const connectionError = new Error("Connection refused to MinIO");
    const mockClient = makeMockClient({
      putObject: jest.fn().mockRejectedValue(connectionError),
    } as Partial<MinioClient>);

    const adapter = new MinioAvatarStorageAdapter(mockClient, TEST_BUCKET);
    const buffer = Buffer.from("fake-bytes");

    await expect(adapter.save(buffer, "image/jpeg")).rejects.toThrow("Connection refused to MinIO");
  });
});

describe("UT-7 extra: MinioAvatarStorageAdapter.getPresignedUrl()", () => {
  it("retorna URL temporária gerada pelo SDK para a object key informada", async () => {
    const expectedUrl = "https://minio.example.com/test-bucket/avatars/uuid.jpg?sig=abc123";
    const mockClient = makeMockClient({
      presignedGetObject: jest.fn().mockResolvedValue(expectedUrl),
    } as Partial<MinioClient>);

    const adapter = new MinioAvatarStorageAdapter(mockClient, TEST_BUCKET);
    const result = await adapter.getPresignedUrl("avatars/uuid.jpg", 60);

    expect(result).toBe(expectedUrl);
    expect(mockClient.presignedGetObject).toHaveBeenCalledWith(TEST_BUCKET, "avatars/uuid.jpg", 60);
  });

  it("propaga exceção do SDK quando presignedGetObject falha", async () => {
    const sdkError = new Error("MinIO SDK error");
    const mockClient = makeMockClient({
      presignedGetObject: jest.fn().mockRejectedValue(sdkError),
    } as Partial<MinioClient>);

    const adapter = new MinioAvatarStorageAdapter(mockClient, TEST_BUCKET);

    await expect(adapter.getPresignedUrl("avatars/uuid.jpg", 60)).rejects.toThrow("MinIO SDK error");
  });
});

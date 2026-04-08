// Testes de segurança ST-4 — Rejeição de upload de arquivo com tipo MIME não permitido
// Rastreabilidade: REQ-1 · DT-6 · T-60 · ST-4
//
// Verifica que o RegisterUserHandler rejeita arquivos de avatar com tipo MIME não permitido
// retornando HTTP 400 sem persistir nenhum dado e sem gravar nenhum arquivo em disco.
//
// Vetor de ataque simulado: upload de arquivo malicioso com extensão falsificada.
// O sistema não deve confiar apenas na extensão — deve validar o tipo MIME declarado.

import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import { setDepsFactory, resetDepsFactory, type RegisterHandlerDeps } from "@/app/api/auth/register/deps";
import type { AvatarStoragePort } from "@/domain/ports/avatar-storage.port";
import type { UserRepository } from "@/domain/ports/user-repository";
import type { PasswordHasher } from "@/domain/ports/password-hasher";
import type { TokenGenerator } from "@/domain/ports/token-generator";
import type { EmailService } from "@/domain/ports/email-service";
import type { ConfirmationTokenRepository } from "@/domain/ports/confirmation-token-repository";
import { registerRateLimiter } from "@/adapters/inbound/http/rate-limiter";

// --- Mocks das dependências ---

/** Rastreia se save() foi chamado (não deve ser chamado em casos de rejeição) */
const mockAvatarSave = jest.fn<Promise<string>, [Buffer, string]>();
const mockAvatarStorage: AvatarStoragePort = {
  save: mockAvatarSave,
};

/** Rastreia se create() foi chamado (não deve criar registro em casos de rejeição) */
const mockUserCreate = jest.fn();
const mockUserRepository: UserRepository = {
  create: mockUserCreate,
  findByEmail: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(null),
  delete: jest.fn(),
  activate: jest.fn(),
};

const mockPasswordHasher: PasswordHasher = {
  hash: jest.fn().mockResolvedValue("$argon2id$mock-hash"),
};

const mockTokenGenerator: TokenGenerator = {
  generate: jest.fn().mockReturnValue("mock-token-32chars0000000000000000"),
};

const mockEmailService: EmailService = {
  send: jest.fn().mockResolvedValue(undefined),
};

const mockConfirmationTokenRepository: ConfirmationTokenRepository = {
  create: jest.fn().mockResolvedValue(undefined),
  findByToken: jest.fn().mockResolvedValue(null),
  markAsUsed: jest.fn().mockResolvedValue(undefined),
};

const testDeps: RegisterHandlerDeps = {
  userRepository: mockUserRepository,
  confirmationTokenRepository: mockConfirmationTokenRepository,
  passwordHasher: mockPasswordHasher,
  tokenGenerator: mockTokenGenerator,
  emailService: mockEmailService,
  avatarStorageAdapter: mockAvatarStorage,
  appBaseUrl: "http://localhost:3000",
  logger: { info: jest.fn(), error: jest.fn() },
};

const validFields = {
  name: "Test User",
  email: "st4-test@example.com",
  password: "Senha@1234",
  passwordConfirmation: "Senha@1234",
  birthDate: "1990-01-01",
};

function makeRequestWithFile(
  mimeType: string,
  content: Uint8Array | string = "fake-content",
  filename: string = "file.bin",
): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(validFields)) {
    formData.append(key, value);
  }
  const file = new File([content], filename, { type: mimeType });
  formData.append("avatar", file);

  return new NextRequest("http://localhost/api/auth/register", {
    method: "POST",
    body: formData,
  });
}

describe("ST-4: Rejeição de upload de arquivo com tipo MIME não permitido", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerRateLimiter.resetAll();
    setDepsFactory(() => testDeps);
  });

  afterEach(() => {
    resetDepsFactory();
  });

  // ST-4a: application/pdf → HTTP 400, nenhum arquivo gravado, nenhum registro criado
  it("(a) rejeita upload com Content-Type application/pdf — HTTP 400, nenhum arquivo gravado, nenhum registro criado", async () => {
    const response = await POST(makeRequestWithFile("application/pdf", "%PDF-1.4 fake content", "document.pdf"));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({
      codigo: 400,
      mensagem: expect.any(String),
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });

    // Nenhum arquivo gravado
    expect(mockAvatarSave).not.toHaveBeenCalled();

    // Nenhum registro criado
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  // ST-4b: text/html → HTTP 400, nenhum arquivo gravado, nenhum registro criado
  it("(b) rejeita upload com Content-Type text/html — HTTP 400, nenhum arquivo gravado, nenhum registro criado", async () => {
    const response = await POST(makeRequestWithFile("text/html", "<html><script>alert(1)</script></html>", "xss.html"));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({
      codigo: 400,
      mensagem: expect.any(String),
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });

    // Nenhum arquivo gravado
    expect(mockAvatarSave).not.toHaveBeenCalled();

    // Nenhum registro criado
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  // ST-4c: tipo permitido mas tamanho > 2MB → HTTP 400
  it("(c) rejeita upload com tipo permitido mas tamanho acima de 2 MB — HTTP 400, nenhum arquivo gravado", async () => {
    const oversizedContent = new Uint8Array(2 * 1024 * 1024 + 1).fill(0xff);

    const response = await POST(makeRequestWithFile("image/jpeg", oversizedContent, "large.jpg"));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json).toMatchObject({
      codigo: 400,
      mensagem: expect.any(String),
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });

    // Nenhum arquivo gravado
    expect(mockAvatarSave).not.toHaveBeenCalled();

    // Nenhum registro criado
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  // ST-4d: tipo permitido e tamanho ≤ 2 MB → HTTP 200, arquivo gravado
  it("(d) aceita upload com tipo permitido e tamanho dentro do limite — HTTP 200, arquivo gravado", async () => {
    mockAvatarSave.mockResolvedValue("avatars/mock-uuid.jpg");
    mockUserCreate.mockResolvedValue({
      id: "mock-user-id",
      name: validFields.name,
      email: validFields.email,
      passwordHash: "$argon2id$mock",
      birthDate: new Date("1990-01-01"),
      avatarKey: "avatars/mock-uuid.jpg",
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const validContent = new Uint8Array(1024).fill(0xff); // 1 KB — bem abaixo do limite
    const response = await POST(makeRequestWithFile("image/jpeg", validContent, "photo.jpg"));

    expect(response.status).toBe(200);

    // save() foi chamado uma vez com o buffer correto e mimeType correto
    expect(mockAvatarSave).toHaveBeenCalledTimes(1);
    expect(mockAvatarSave).toHaveBeenCalledWith(
      expect.any(Buffer),
      "image/jpeg",
    );
  });
});

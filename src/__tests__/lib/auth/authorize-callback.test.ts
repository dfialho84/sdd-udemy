// UT-8: authorize callback — identifier vazio retorna null sem invocar AuthenticateUserUseCase
// Testa a funcao authorizeCredentials extraida do config.ts — sem dependencia de next-auth ESM.
// Rastreabilidade: T-22 · REQ-6 · NFR-6 · Scenario: "Login com identificador vazio"

import { authorizeCredentials } from "@/lib/auth/authorize";
import { AuthenticateUserUseCase } from "@/application/use-cases/authenticate-user.use-case";
import type { AuthenticateUserUseCaseDeps } from "@/application/use-cases/authenticate-user.use-case";

// Mock do AuthenticateUserUseCase para verificar que NAO e invocado quando identifier vazio
jest.mock("@/application/use-cases/authenticate-user.use-case", () => {
  const actual = jest.requireActual(
    "@/application/use-cases/authenticate-user.use-case",
  );
  return {
    ...actual,
    AuthenticateUserUseCase: jest.fn(),
  };
});

const MockedUseCase = AuthenticateUserUseCase as jest.MockedClass<
  typeof AuthenticateUserUseCase
>;

// ─── Fixtures ──────────────────────────────────────────────────────────────

const STUB_DEPS: AuthenticateUserUseCaseDeps = {
  userRepository: { findByIdentifier: jest.fn() },
  passwordVerifier: { verify: jest.fn() },
  loginAttemptRepository: {
    save: jest.fn(),
    countRecentFailures: jest.fn(),
    findActiveBlock: jest.fn().mockResolvedValue(null),
    createBlock: jest.fn(),
    removeBlock: jest.fn(),
    resetFailureCount: jest.fn(),
  },
  logger: { info: jest.fn(), error: jest.fn() },
};

function getDeps(): AuthenticateUserUseCaseDeps {
  return STUB_DEPS;
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── UT-8: identifier vazio ────────────────────────────────────────────────

describe("UT-8: authorizeCredentials — identifier vazio", () => {
  it("identifier vazio retorna null sem invocar AuthenticateUserUseCase (REQ-6)", async () => {
    const result = await authorizeCredentials(
      { identifier: "", password: "qualquer" },
      getDeps,
    );

    expect(result).toBeNull();
    expect(MockedUseCase).not.toHaveBeenCalled();
  });

  it("identifier ausente (undefined) retorna null sem invocar use case", async () => {
    const result = await authorizeCredentials(
      { password: "qualquer" },
      getDeps,
    );

    expect(result).toBeNull();
    expect(MockedUseCase).not.toHaveBeenCalled();
  });

  it("identifier com apenas espacos retorna null — Zod trim + min(1) (NFR-6)", async () => {
    const result = await authorizeCredentials(
      { identifier: "   ", password: "qualquer" },
      getDeps,
    );

    expect(result).toBeNull();
    expect(MockedUseCase).not.toHaveBeenCalled();
  });

  it("password vazio retorna null sem invocar use case", async () => {
    const result = await authorizeCredentials(
      { identifier: "alice", password: "" },
      getDeps,
    );

    expect(result).toBeNull();
    expect(MockedUseCase).not.toHaveBeenCalled();
  });

  it("credentials undefined retorna null sem invocar use case", async () => {
    const result = await authorizeCredentials(undefined, getDeps);

    expect(result).toBeNull();
    expect(MockedUseCase).not.toHaveBeenCalled();
  });
});

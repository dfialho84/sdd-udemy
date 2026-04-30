// Testes do PasswordRecoveryRouteHandler — validacao de entrada HTTP
// UT-13: handler rejeita entradas invalidas antes de delegar ao caso de uso
// Rastreabilidade: T-25 · REQ-3 · REQ-9

import { NextRequest } from "next/server";
import { POST as requestPOST } from "@/app/api/auth/password-reset/route";
import { POST as confirmPOST } from "@/app/api/auth/password-reset/confirm/route";

// ─── Tests for POST /api/auth/password-reset (request endpoint) ──────

describe("UT-13: PasswordRecoveryRouteHandler — POST /request", () => {
  it("retorna 400 quando email tem formato invalido, sem invocar caso de uso (REQ-3)", async () => {
    const req = new NextRequest("http://localhost/api/auth/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "invalido" }),
    });

    const res = await requestPOST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_EMAIL");
  });

  it("retorna 400 quando email esta ausente no body (REQ-3)", async () => {
    const req = new NextRequest("http://localhost/api/auth/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await requestPOST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("INVALID_EMAIL");
  });

  it("retorna 400 quando email e string vazia", async () => {
    const req = new NextRequest("http://localhost/api/auth/password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "" }),
    });

    const res = await requestPOST(req);

    expect(res.status).toBe(400);
  });
});

// ─── Tests for POST /api/auth/password-reset/confirm ─────────────────

describe("UT-13: PasswordRecoveryRouteHandler — POST /confirm", () => {
  it("retorna 400 com PASSWORDS_MISMATCH quando password !== passwordConfirm, sem invocar caso de uso (REQ-9)", async () => {
    const req = new NextRequest(
      "http://localhost/api/auth/password-reset/confirm",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: "a".repeat(32),
          password: "Senha@123",
          passwordConfirm: "Senha@456",
        }),
      },
    );

    const res = await confirmPOST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("PASSWORDS_MISMATCH");
    expect(body.message).toBe("As senhas nao coincidem");
  });

  it("retorna 400 quando token esta ausente no body", async () => {
    const req = new NextRequest(
      "http://localhost/api/auth/password-reset/confirm",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: "Senha@123",
          passwordConfirm: "Senha@123",
        }),
      },
    );

    const res = await confirmPOST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("TOKEN_INVALID");
  });
});

/**
 * LoginPage — estado de loading do botao de submit e exibicao de mensagens de erro
 *
 * Rastreabilidade: T-03 · T-04 · REQ-1 · REQ-5 · REQ-7 · REQ-10 · REQ-11 · NFR-1 · NFR-6
 *
 * Casos cobertos (T-03):
 * (a) Botao "Login" presente no estado inicial (nao loading)
 * (b) Formulario renderiza campos identifier e password
 * (c) Spinner nao e exibido no estado inicial
 * (d) Botao permanece funcional apos submit
 * (e) aria-busy nao e true no estado inicial
 *
 * Casos cobertos (T-04):
 * (f) Mensagem de erro nao e exibida no estado inicial
 * (g) Mensagem "Usuario ou senha incorretos" exibida para erro CredentialsSignin na URL
 * (h) Mensagem "Muitas tentativas fracassadas..." exibida para erro account_blocked na URL
 * (i) Erro desconhecido exibe mensagem generica "Usuario ou senha incorretos"
 * (j) Mensagem de erro e limpa ao submeter novo formulario
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import LoginPage from "@/app/(auth)/login/page";

// Mock do next-auth para evitar dependencia em testes de UI
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

// Mock de useSearchParams do next/navigation — controla o parametro ?error= da URL
const mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/login",
}));

// Limpa o mock de searchParams antes de cada teste
beforeEach(() => {
  mockSearchParams.delete("error");
});

describe("LoginPage — T-03: estado de loading do botao de submit", () => {
  it("(a) botao Login exibe texto padrao no estado inicial", () => {
    render(<LoginPage />);
    const button = screen.getByTestId("submit-button");
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent("Login");
  });

  it("(b) formulario renderiza campos identifier e password", () => {
    render(<LoginPage />);
    expect(screen.getByTestId("input-identifier")).toBeInTheDocument();
    expect(screen.getByTestId("input-password")).toBeInTheDocument();
  });

  it("(c) spinner nao e exibido no estado inicial", () => {
    render(<LoginPage />);
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });

  it("(d) botao permanece presente e funcional apos submit", async () => {
    render(<LoginPage />);

    const form = screen.getByTestId("login-form");
    const identifierInput = screen.getByTestId("input-identifier");
    const passwordInput = screen.getByTestId("input-password");
    const submitButton = screen.getByTestId("submit-button");

    fireEvent.change(identifierInput, { target: { value: "alice" } });
    fireEvent.change(passwordInput, { target: { value: "Senh@1234" } });

    expect(submitButton).not.toBeDisabled();
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeInTheDocument();
    });
  });

  it("(e) aria-busy nao e true no estado inicial", () => {
    render(<LoginPage />);
    const button = screen.getByTestId("submit-button");
    expect(button).not.toHaveAttribute("aria-busy", "true");
  });
});

describe("LoginPage — T-04: exibicao de mensagens de erro", () => {
  it("(f) mensagem de erro nao e exibida no estado inicial sem parametro de erro", () => {
    render(<LoginPage />);
    expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
  });

  it("(g) exibe 'Usuario ou senha incorretos' para erro CredentialsSignin na URL", async () => {
    mockSearchParams.set("error", "CredentialsSignin");
    render(<LoginPage />);

    await waitFor(() => {
      const errorEl = screen.getByTestId("error-message");
      expect(errorEl).toBeInTheDocument();
      expect(errorEl).toHaveTextContent("Usuário ou senha incorretos");
    });
  });

  it("(h) exibe mensagem de bloqueio para erro account_blocked na URL", async () => {
    mockSearchParams.set("error", "account_blocked");
    render(<LoginPage />);

    await waitFor(() => {
      const errorEl = screen.getByTestId("error-message");
      expect(errorEl).toBeInTheDocument();
      expect(errorEl).toHaveTextContent(
        "Muitas tentativas fracassadas. Tente novamente em 15 minutos"
      );
    });
  });

  it("(i) erro desconhecido exibe mensagem generica 'Usuario ou senha incorretos'", async () => {
    mockSearchParams.set("error", "UnknownError");
    render(<LoginPage />);

    await waitFor(() => {
      const errorEl = screen.getByTestId("error-message");
      expect(errorEl).toBeInTheDocument();
      expect(errorEl).toHaveTextContent("Usuário ou senha incorretos");
    });
  });

  it("(j) mensagem de erro tem role=alert e aria-live=assertive para acessibilidade", async () => {
    mockSearchParams.set("error", "CredentialsSignin");
    render(<LoginPage />);

    await waitFor(() => {
      const errorEl = screen.getByTestId("error-message");
      expect(errorEl).toHaveAttribute("role", "alert");
      expect(errorEl).toHaveAttribute("aria-live", "assertive");
    });
  });

  it("(k) mensagem de erro e limpa ao submeter novo formulario", async () => {
    mockSearchParams.set("error", "CredentialsSignin");
    render(<LoginPage />);

    // Aguarda exibicao do erro inicial
    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
    });

    // Submete o formulario
    await act(async () => {
      fireEvent.submit(screen.getByTestId("login-form"));
    });

    // Mensagem deve ter sido limpa ao iniciar novo submit
    await waitFor(() => {
      expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
    });
  });
});

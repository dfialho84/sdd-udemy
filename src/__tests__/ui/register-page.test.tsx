/**
 * UT-10: RegisterPage — acessibilidade WCAG 2.1 AA e campos do formulario
 *
 * Rastreabilidade: T-70 · T-84 · REQ-2 · REQ-7 · NFR-6 · NFR-9 · DT-8
 *
 * Casos cobertos:
 * (a) Renderizacao do formulario nao gera violacoes axe reportadas
 * (b) Campos nome, username, email, senha, confirmacao de senha, data de nascimento e foto de perfil
 *     presentes no DOM com labels associados corretamente
 * (c) Campos de senha com type="password"
 * (d) Mensagens de erro de validacao acessiveis via aria-live ou role="alert" quando exibidas
 * (e) HTTP 409 com mensagem de username duplicado exibe erro acessivel no campo username (REQ-7 · NFR-6 · T-84)
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import RegisterPage from "@/app/register/page";

expect.extend(toHaveNoViolations);

// Mock global.fetch para evitar chamadas reais ao servidor nos testes unitarios
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  // Resposta padrao: erro de servidor para nao interferir nos testes de UI
  mockFetch.mockResolvedValue({
    ok: false,
    json: async () => ({
      codigo: 500,
      mensagem: "Erro interno",
      requestId: "test-request-id",
      timestamp: new Date().toISOString(),
    }),
  });
});

describe("UT-10: RegisterPage — acessibilidade WCAG 2.1 AA e campos do formulario", () => {
  it("(a) renderizacao do formulario nao gera violacoes axe reportadas", async () => {
    const { container } = render(<RegisterPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("(b) campos nome, username, email, senha, confirmacao de senha, data de nascimento e foto de perfil presentes com labels associados", () => {
    render(<RegisterPage />);

    // Campo nome — label htmlFor="name" associado a input id="name"
    const nameInput = screen.getByLabelText(/nome completo/i);
    expect(nameInput).toBeInTheDocument();

    // Campo username — label htmlFor="username" associado a input id="username"
    const usernameInput = screen.getByLabelText(/^username$/i);
    expect(usernameInput).toBeInTheDocument();

    // Campo email — label htmlFor="email" associado a input id="email"
    const emailInput = screen.getByLabelText(/^email$/i);
    expect(emailInput).toBeInTheDocument();

    // Campo senha — label htmlFor="password" associado a input id="password"
    // getByLabelText com "Senha" pode pegar "Confirmar senha" tambem, usamos "^Senha$"
    const passwordInput = screen.getByLabelText(/^senha$/i);
    expect(passwordInput).toBeInTheDocument();

    // Campo confirmacao de senha — label htmlFor="passwordConfirmation"
    const passwordConfirmInput = screen.getByLabelText(/confirmar senha/i);
    expect(passwordConfirmInput).toBeInTheDocument();

    // Campo data de nascimento — label htmlFor="birthDate"
    const birthDateInput = screen.getByLabelText(/data de nascimento/i);
    expect(birthDateInput).toBeInTheDocument();

    // Campo foto de perfil — label htmlFor="avatar"
    const avatarInput = screen.getByLabelText(/foto de perfil/i);
    expect(avatarInput).toBeInTheDocument();
  });

  it("(c) campos de senha com type=password (nao expoe o valor como texto)", () => {
    render(<RegisterPage />);

    const passwordInput = screen.getByLabelText(/^senha$/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const passwordConfirmInput = screen.getByLabelText(/confirmar senha/i);
    expect(passwordConfirmInput).toHaveAttribute("type", "password");
  });

  it("(d) mensagem de erro de API acessivel via role=alert e aria-live quando exibida", async () => {
    // Mocka fetch para retornar erro de servidor com mensagem
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        codigo: 500,
        mensagem: "Erro ao realizar cadastro.",
        requestId: "req-test",
        timestamp: new Date().toISOString(),
      }),
    });

    render(<RegisterPage />);

    // Preenche o formulario com dados validos para passar a validacao Zod e chegar ao fetch
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: "Joao Silva" },
      });
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: "joao@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^senha$/i), {
        target: { value: "Senha@1234" },
      });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
        target: { value: "Senha@1234" },
      });
      fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
        target: { value: "1990-06-15" },
      });
    });

    // Submete o formulario
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));
    });

    // Aguarda o erro aparecer no DOM
    await waitFor(() => {
      const alertElement = screen.getByRole("alert");
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveAttribute("aria-live", "polite");
    });
  });

  it("(e) HTTP 409 com mensagem de username duplicado exibe erro acessivel no campo username (REQ-7 · NFR-6 · T-84)", async () => {
    // Mocka fetch para retornar HTTP 409 com mensagem de username duplicado
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        codigo: 409,
        mensagem: "Este username ja esta cadastrado. Escolha outro.",
        requestId: "req-username-duplicado",
        timestamp: new Date().toISOString(),
      }),
    });

    render(<RegisterPage />);

    // Preenche todos os campos obrigatorios com dados validos para passar a validacao Zod
    await act(async () => {
      fireEvent.change(screen.getByLabelText(/nome completo/i), {
        target: { value: "Joao Silva" },
      });
      fireEvent.change(screen.getByLabelText(/^username$/i), {
        target: { value: "joaosilva" },
      });
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { value: "joao@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^senha$/i), {
        target: { value: "Senha@1234" },
      });
      fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
        target: { value: "Senha@1234" },
      });
      fireEvent.change(screen.getByLabelText(/data de nascimento/i), {
        target: { value: "1990-06-15" },
      });
    });

    // Submete o formulario
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));
    });

    // Aguarda o erro de username aparecer no DOM de forma acessivel
    await waitFor(() => {
      const usernameError = screen.getByTestId("error-username");
      expect(usernameError).toBeInTheDocument();
      expect(usernameError).toHaveTextContent(
        "Este username ja esta cadastrado. Escolha outro.",
      );
      expect(usernameError).toHaveAttribute("role", "alert");
      expect(usernameError).toHaveAttribute("aria-live", "polite");
    });

    // Erro geral (errorMessage) nao deve aparecer — o erro esta no campo username
    expect(screen.queryByTestId("error-message")).not.toBeInTheDocument();
  });
});

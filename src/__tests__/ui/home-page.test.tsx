/**
 * UT-9: HomePage — acessibilidade WCAG 2.1 AA
 *
 * Rastreabilidade: T-67 · REQ-1 · REQ-2 · NFR-9 · DT-8
 * Scenario: "Acessar formulario de cadastro via link na home"
 *
 * Casos cobertos:
 * (a) Renderizacao da pagina nao gera violacoes axe reportadas
 * (b) Link de registro presente no DOM com texto acessivel (nao vazio, nao generico)
 * (c) Link de registro navegavel por teclado com href apontando para /register
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import HomePage from "@/app/page";

expect.extend(toHaveNoViolations);

describe("UT-9: HomePage — acessibilidade WCAG 2.1 AA", () => {
  it("(a) renderizacao da pagina nao gera violacoes axe reportadas", async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("(b) link de registro presente no DOM com texto acessivel nao vazio e nao generico", () => {
    render(<HomePage />);
    const link = screen.getByRole("link", { name: /criar conta/i });
    expect(link).toBeInTheDocument();
    const linkText = link.textContent?.trim() ?? "";
    expect(linkText.length).toBeGreaterThan(0);
    // Texto nao deve ser generico (ex: "clique aqui", "aqui", "link")
    expect(linkText.toLowerCase()).not.toBe("clique aqui");
    expect(linkText.toLowerCase()).not.toBe("aqui");
    expect(linkText.toLowerCase()).not.toBe("link");
  });

  it("(c) link de registro navegavel por teclado com href apontando para /register", () => {
    render(<HomePage />);
    const link = screen.getByRole("link", { name: /criar conta/i });
    expect(link).toHaveAttribute("href", "/register");
    // Link deve ser um elemento <a> navegavel por teclado (href presente = focavel por padrao)
    expect(link.tagName.toLowerCase()).toBe("a");
  });
});

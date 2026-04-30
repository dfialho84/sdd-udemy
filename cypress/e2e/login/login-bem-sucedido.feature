Feature: Login

  # GH-1 — Login bem-sucedido com usuario
  # Rastreabilidade: T-16 · REQ-2 · REQ-3 · REQ-4 · Scenario: "Login bem-sucedido com usuário"

  Scenario: Login bem-sucedido com usuário
    Given que o usuário "alice" existe com senha válida
    When o usuário preenche o formulário com "alice" como identificador e a senha correta
    And clica no botão de login
    Then o sistema cria uma sessão autenticada
    And o usuário é redirecionado para sua área pessoal

  # GH-2 — Login bem-sucedido com email
  # Rastreabilidade: T-16 · REQ-2 · REQ-3 · REQ-4 · Scenario: "Login bem-sucedido com email"

  Scenario: Login bem-sucedido com email
    Given que o usuário com email "alice@example.com" existe com senha válida
    When o usuário preenche o formulário com "alice@example.com" como identificador e a senha correta
    And clica no botão de login
    Then o sistema cria uma sessão autenticada
    And o usuário é redirecionado para sua área pessoal

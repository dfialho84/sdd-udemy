Feature: Login — Credenciais inválidas

  # GH-4 — Login com senha incorreta
  # Rastreabilidade: T-20 · REQ-5 · REQ-7 · NFR-6 · Scenario: "Login com senha incorreta"

  Scenario: Login com senha incorreta
    Given que o usuário "alice" existe
    When o usuário preenche o formulário com "alice" como identificador e uma senha incorreta
    And clica no botão de login
    Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"
    And o usuário permanece na página de login

  # GH-5 — Login com usuário inexistente
  # Rastreabilidade: T-20 · REQ-5 · REQ-7 · NFR-6 · Scenario: "Login com usuário inexistente"

  Scenario: Login com usuário inexistente
    When o usuário preenche o formulário com um identificador que não existe
    And clica no botão de login
    Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"
    And o usuário permanece na página de login

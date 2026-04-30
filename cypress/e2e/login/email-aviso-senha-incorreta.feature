Feature: Login — Email de aviso para senha incorreta

  # GH-9 — Email de aviso para senha incorreta
  # Rastreabilidade: T-56 · REQ-14 · REQ-5 · REQ-7 · NFR-8
  # Scenario: "Email de aviso para senha incorreta"

  Scenario: Email de aviso para senha incorreta
    Given que o usuário "alice" existe com email "alice@example.com" cadastrado
    When o usuário preenche o formulário com "alice" como identificador e uma senha incorreta
    And clica no botão de login
    Then o sistema envia um email de aviso para "alice@example.com" alertando sobre a tentativa de login falhada
    And o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"
    And o usuário permanece na página de login

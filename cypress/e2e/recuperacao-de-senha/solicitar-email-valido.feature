Feature: Solicitar recuperacao com email valido
  # GH-1: Scenario "Solicitar recuperacao com email valido"
  # Rastreabilidade: T-30 · REQ-1 · REQ-2 · REQ-3

  Scenario: Solicitar recuperacao com email valido
    Given que o usuario esta na tela de login
    When o usuario clica em "Esqueci a senha"
    Then o sistema exibe um formulario com campo de email
    And o usuario consegue informar seu email e submeter

Feature: Confirmacao de Conta

  # GH-3 — Confirmacao de conta via link valido
  # Rastreabilidade: T-42 · REQ-10 · REQ-11 · Scenario: "Confirmacao de conta via link valido"

  Scenario: Confirmacao de conta via link valido
    Given que o visitante possui um cadastro com status "pendente" e recebeu o link de confirmacao por email
    When o visitante clica no link de confirmacao dentro do prazo de 24 horas
    Then o sistema exibe uma mensagem de sucesso informando que a conta foi ativada
    And um link para acessar o sistema e apresentado ao visitante

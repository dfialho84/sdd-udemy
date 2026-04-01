Feature: Registrar Usuario

  # GH-1 — Cadastro realizado com dados validos
  # Rastreabilidade: T-22 · REQ-1 · REQ-8 · REQ-9

  Scenario: Cadastro realizado com dados validos
    Given que o visitante esta na pagina de cadastro
    When o visitante preenche todos os campos obrigatorios com dados validos e envia o formulario
    Then o visitante ve uma tela informando que um link de confirmacao foi enviado ao seu email
    And o sistema envia um email de confirmacao ao endereco informado

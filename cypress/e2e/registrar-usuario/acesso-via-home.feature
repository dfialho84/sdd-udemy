Feature: Registrar Usuario

  # GH-1 — Acessar formulario de cadastro via link na home
  # Rastreabilidade: T-68 · REQ-1 · REQ-2 · NFR-1 · NFR-9

  Scenario: Acessar formulario de cadastro via link na home
    Given que o visitante esta na pagina inicial
    When o visitante clica no link de registro
    Then o visitante e levado para a pagina de cadastro
    And o sistema exibe um formulario com os campos nome, email, senha, confirmacao de senha, data de nascimento e foto de perfil

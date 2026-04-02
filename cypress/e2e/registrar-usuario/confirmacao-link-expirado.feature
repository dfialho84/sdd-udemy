Feature: Confirmacao de Cadastro com Link Expirado

  # GH-4 — Confirmacao de cadastro com link expirado
  # Rastreabilidade: T-45 · REQ-12 · REQ-13 · Scenario: "Confirmacao de cadastro com link expirado"

  @gh4
  Scenario: Confirmacao de cadastro com link expirado
    Given que um visitante possui um cadastro com status "pendente" e cujo link de confirmacao foi gerado ha mais de 24 horas
    When o visitante acessa o link de confirmacao expirado
    Then o sistema exibe mensagem informando que o link expirou e que o cadastro deve ser realizado novamente
    And o cadastro pendente associado ao link e removido automaticamente
    And o visitante e redirecionado para a pagina de cadastro

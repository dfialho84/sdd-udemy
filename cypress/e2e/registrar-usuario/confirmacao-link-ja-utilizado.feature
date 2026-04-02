Feature: Confirmacao de Cadastro com Link Ja Utilizado

  # GH-5 — Confirmacao de cadastro com link ja utilizado
  # Rastreabilidade: T-47 · REQ-14 · REQ-15 · Scenario: "Confirmacao de cadastro com link ja utilizado"

  @gh5
  Scenario: Confirmacao de cadastro com link ja utilizado
    Given que o visitante possui uma conta ativada apos clicar no link de confirmacao
    When o visitante tenta acessar o mesmo link de confirmacao novamente
    Then o sistema exibe mensagem informando que o link de confirmacao ja foi utilizado
    And o sistema nao altera o status da conta

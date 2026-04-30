Feature: Receber email com link valido
  # GH-2: Scenario "Receber email com link valido"
  # Rastreabilidade: T-31 · REQ-4 · REQ-5

  Scenario: Receber email com link valido
    Given que um usuario solicitou recuperacao de senha com email valido
    When o sistema processa a solicitacao
    Then o sistema envia um email contendo um link unico de recuperacao
    And o link contem um token com expiracao de 12 horas

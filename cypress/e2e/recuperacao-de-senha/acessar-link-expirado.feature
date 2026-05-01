Feature: Acessar link expirado
  # GH-7: Scenario "Acessar link expirado"
  # Rastreabilidade: T-36 · REQ-12

  Scenario: Acessar link expirado
    Given que o usuario recebeu um link de recuperacao
    And mais de 12 horas passaram desde a geracao do link
    When o usuario clica no link expirado
    Then o sistema detecta a expiracao do token
    And o sistema exibe mensagem de erro "O link de recuperacao expirou"
    And o sistema redireciona para a pagina de recuperacao
    And o sistema oferece opcao de solicitar um novo link

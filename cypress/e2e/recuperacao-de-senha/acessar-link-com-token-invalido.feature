Feature: Acessar link com token invalido
  # GH-8: Scenario "Acessar link com token invalido"
  # Rastreabilidade: T-37 · REQ-13

  Scenario: Acessar link com token invalido
    Given que o usuario possui uma URL com um token malformado ou invalido
    When o usuario tenta acessar a URL
    Then o sistema valida o formato do token
    And o sistema rejeita o token invalido
    And o sistema exibe mensagem de erro "O link de recuperacao e invalido"
    And o sistema redireciona para a pagina de recuperacao

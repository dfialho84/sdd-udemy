Feature: Redefinir senha com link valido
  # GH-3: Scenario "Redefinir senha com link valido"
  # Rastreabilidade: T-32 · REQ-7 · REQ-8 · REQ-10 · REQ-11

  Scenario: Redefinir senha com link valido
    Given que o usuario recebeu um link valido de recuperacao
    When o usuario clica no link e acessa a tela de redefinicao
    And o usuario informa uma nova senha valida e sua confirmacao
    And o usuario submete o formulario
    Then o sistema valida a forca da senha
    And o sistema aceita a redefinicao
    And o sistema exibe mensagem de sucesso
    And o sistema redireciona para tela de login

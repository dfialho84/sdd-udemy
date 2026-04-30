Feature: Redefinir senha com senhas nao coincidentes
  # GH-4: Scenario "Redefinir senha com senhas nao coincidentes"
  # Rastreabilidade: T-33 · REQ-9

  Scenario: Redefinir senha com senhas nao coincidentes
    Given que o usuario acessou a tela de redefinicao com um link valido
    When o usuario informa uma nova senha em um campo
    And o usuario informa uma confirmacao diferente no outro campo
    And o usuario submete o formulario
    Then o sistema detecta a inconsistencia
    And o sistema exibe mensagem de erro "As senhas nao coincidem"
    And o formulario permanece visivel para nova tentativa

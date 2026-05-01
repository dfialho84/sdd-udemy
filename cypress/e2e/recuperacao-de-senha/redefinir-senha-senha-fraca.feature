Feature: Redefinir senha com senha fraca
  # GH-5: Scenario "Redefinir senha com senha fraca"
  # Rastreabilidade: T-34 · REQ-8

  Scenario: Redefinir senha com senha fraca
    Given que o usuario acessou a tela de redefinicao com um link valido
    When o usuario informa uma senha que nao atende aos criterios de forca/complexidade
    And o usuario submete o formulario
    Then o sistema valida a forca da senha
    And o sistema exibe mensagem de erro indicando os criterios nao atendidos
    And o formulario permanece visivel para nova tentativa

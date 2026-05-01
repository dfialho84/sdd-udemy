Feature: Solicitar recuperacao com email inexistente
  # GH-6: Scenario "Solicitar recuperacao com email inexistente"
  # Rastreabilidade: T-35 · REQ-2 · REQ-14 · REQ-15

  Scenario: Solicitar recuperacao com email inexistente
    Given que o usuario esta na tela de formulario de recuperacao
    When o usuario informa um email que nao existe no sistema
    And o usuario submete o formulario
    Then o sistema nao revela se o email existe ou nao
    And o sistema exibe mensagem generica "Se existe conta com esse email, voce recebera um link de recuperacao"
    And o sistema oferece um link para a pagina de cadastro
    And nenhum email e enviado

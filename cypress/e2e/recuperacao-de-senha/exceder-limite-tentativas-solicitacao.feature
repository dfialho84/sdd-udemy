Feature: Exceder limite de tentativas de solicitacao
  # GH-9: Scenario "Exceder limite de tentativas de solicitacao"
  # Rastreabilidade: T-38 · REQ-16 · NFR-5 · NFR-6

  Scenario: Exceder limite de tentativas de solicitacao
    Given que o usuario ja realizou 5 solicitacoes de recuperacao no mesmo IP em menos de 1 hora
    When o usuario tenta realizar uma 6a solicitacao de recuperacao
    Then o sistema detecta o limite de tentativas excedido
    And o sistema exibe mensagem "Muitas tentativas de recuperacao. Tente novamente em 1 hora"
    And o sistema bloqueia a tentativa
    And a solicitacao e registrada em logs de seguranca

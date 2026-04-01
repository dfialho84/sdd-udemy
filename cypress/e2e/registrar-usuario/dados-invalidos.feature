Feature: Registrar Usuario — Dados Invalidos

  # GH-2 — Cadastro com dados invalidos no formulario
  # Rastreabilidade: T-19 · REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7

  Scenario Outline: Cadastro com dados invalidos no formulario
    Given o visitante esta na pagina de cadastro
    When o visitante preenche o formulario com <situacao>
    And o visitante submete o formulario
    Then o sistema exibe a mensagem "<mensagem_de_erro>"
    And nenhum cadastro e criado

    Examples:
      | situacao                                          | mensagem_de_erro                                                                                                            |
      | email ja associado a uma conta existente          | Este email já está cadastrado. Tente fazer login ou use outro endereço.                                                     |
      | senha sem caractere especial                      | A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.                  |
      | confirmacao de senha diferente da senha informada | As senhas não coincidem.                                                                                                    |
      | nome em branco                                    | O campo nome completo é obrigatório.                                                                                        |
      | data de nascimento em branco                      | O campo data de nascimento é obrigatório.                                                                                   |
      | email com formato invalido                        | Informe um endereço de email válido.                                                                                        |

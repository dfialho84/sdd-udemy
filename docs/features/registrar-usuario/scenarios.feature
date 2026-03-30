Feature: Registrar Usuario

  Scenario: Cadastro realizado com dados validos
    Given que o visitante esta na pagina de cadastro
    When o visitante preenche todos os campos obrigatorios com dados validos e envia o formulario
    Then o visitante ve uma tela informando que um link de confirmacao foi enviado ao seu email
    And o sistema envia um email de confirmacao ao endereco informado

  Scenario Outline: Cadastro com dados invalidos no formulario
    Given o visitante esta na pagina de cadastro
    When o visitante preenche o formulario com <situacao>
    And o visitante submete o formulario
    Then o sistema exibe a mensagem "<mensagem_de_erro>"
    And nenhum cadastro e criado

    Examples:
      | situacao                                          | mensagem_de_erro                                                                                          |
      | email ja associado a uma conta existente          | Este email ja esta cadastrado. Tente fazer login ou use outro endereco.                                   |
      | senha sem caractere especial                      | A senha deve ter no minimo 8 caracteres, incluindo maiusculas, minusculas, numeros e caracteres especiais. |
      | confirmacao de senha diferente da senha informada | As senhas nao coincidem.                                                                                  |
      | nome em branco                                    | O campo nome e obrigatorio.                                                                               |
      | data de nascimento em branco                      | O campo data de nascimento e obrigatorio.                                                                 |
      | email com formato invalido                        | Informe um endereco de email valido.                                                                      |

  Scenario: Confirmacao de conta via link valido
    Given que o visitante possui um cadastro com status "pendente" e recebeu o link de confirmacao por email
    When o visitante clica no link de confirmacao dentro do prazo de 24 horas
    Then o sistema exibe uma mensagem de sucesso informando que a conta foi ativada
    And um link para acessar o sistema e apresentado ao visitante

  Scenario: Confirmacao de cadastro com link expirado
    Given que um visitante possui um cadastro com status "pendente" e cujo link de confirmacao foi gerado ha mais de 24 horas
    When o visitante acessa o link de confirmacao expirado
    Then o sistema exibe mensagem informando que o link expirou e que o cadastro deve ser realizado novamente
    And o cadastro pendente associado ao link e removido automaticamente
    And o visitante e redirecionado para a pagina de cadastro

  Scenario: Confirmacao de cadastro com link ja utilizado
    Given que o visitante possui uma conta ativada apos clicar no link de confirmacao
    When o visitante tenta acessar o mesmo link de confirmacao novamente
    Then o sistema exibe mensagem informando que o link de confirmacao ja foi utilizado
    And o sistema nao altera o status da conta

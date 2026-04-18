Feature: Recuperação de Senha
  Um fluxo seguro que permite ao usuário redefinir sua senha quando a esquece, sem intervenção administrativa.

  Scenario: Solicitar recuperação com email válido
    Given que o usuário está na tela de login
    When o usuário clica em "Esqueci a senha"
    Then o sistema exibe um formulário com campo de email
    And o usuário consegue informar seu email e submeter

  Scenario: Receber email com link válido
    Given que um usuário solicitou recuperação de senha com email válido
    When o sistema processa a solicitação
    Then o sistema envia um email contendo um link único de recuperação
    And o link contém um token com expiração de 12 horas

  Scenario: Redefinir senha com link válido
    Given que o usuário recebeu um link válido de recuperação
    When o usuário clica no link e acessa a tela de redefinição
    And o usuário informa uma nova senha válida e sua confirmação
    And o usuário submete o formulário
    Then o sistema valida a força da senha
    And o sistema aceita a redefinição
    And o sistema exibe mensagem de sucesso
    And o sistema redireciona para tela de login

  Scenario: Redefinir senha com senhas não coincidentes
    Given que o usuário acessou a tela de redefinição com um link válido
    When o usuário informa uma nova senha em um campo
    And o usuário informa uma confirmação diferente no outro campo
    And o usuário submete o formulário
    Then o sistema detecta a inconsistência
    And o sistema exibe mensagem de erro "As senhas não coincidem"
    And o formulário permanece visível para nova tentativa

  Scenario: Redefinir senha com senha fraca
    Given que o usuário acessou a tela de redefinição com um link válido
    When o usuário informa uma senha que não atende aos critérios de força/complexidade
    And o usuário submete o formulário
    Then o sistema valida a força da senha
    And o sistema exibe mensagem de erro indicando os critérios não atendidos
    And o formulário permanece visível para nova tentativa

  Scenario: Solicitar recuperação com email inexistente
    Given que o usuário está na tela de formulário de recuperação
    When o usuário informa um email que não existe no sistema
    And o usuário submete o formulário
    Then o sistema não revela se o email existe ou não
    And o sistema exibe mensagem genérica "Se existe conta com esse email, você receberá um link de recuperação"
    And o sistema oferece um link para a página de cadastro
    And nenhum email é enviado

  Scenario: Acessar link expirado
    Given que o usuário recebeu um link de recuperação
    And mais de 12 horas passaram desde a geração do link
    When o usuário clica no link expirado
    Then o sistema detecta a expiração do token
    And o sistema exibe mensagem de erro "O link de recuperação expirou"
    And o sistema redireciona para a página de recuperação
    And o sistema oferece opção de solicitar um novo link

  Scenario: Acessar link com token inválido
    Given que o usuário possui uma URL com um token malformado ou inválido
    When o usuário tenta acessar a URL
    Then o sistema valida o formato do token
    And o sistema rejeita o token inválido
    And o sistema exibe mensagem de erro "O link de recuperação é inválido"
    And o sistema redireciona para a página de recuperação

  Scenario: Exceder limite de tentativas de solicitação
    Given que o usuário já realizou 5 solicitações de recuperação no mesmo IP em menos de 1 hora
    When o usuário tenta realizar uma 6ª solicitação de recuperação
    Then o sistema detecta o limite de tentativas excedido
    And o sistema exibe mensagem "Muitas tentativas de recuperação. Tente novamente em 1 hora"
    And o sistema bloqueia a tentativa
    And a solicitação é registrada em logs de segurança

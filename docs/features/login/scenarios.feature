Feature: Login
  Permitir que um usuário previamente cadastrado acesse a plataforma autenticando-se com seu identificador (usuário ou email) e senha.

  Scenario: Login bem-sucedido com usuário
    Given que o usuário "alice" existe com senha válida
    When o usuário preenche o formulário com "alice" como identificador e a senha correta
    And clica no botão de login
    Then o sistema cria uma sessão autenticada
    And o usuário é redirecionado para sua área pessoal

  Scenario: Login bem-sucedido com email
    Given que o usuário com email "alice@example.com" existe com senha válida
    When o usuário preenche o formulário com "alice@example.com" como identificador e a senha correta
    And clica no botão de login
    Then o sistema cria uma sessão autenticada
    And o usuário é redirecionado para sua área pessoal

  Scenario: Login com identificador vazio
    When o usuário tenta fazer login sem preencher o campo de identificador
    And clica no botão de login
    Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"
    And o usuário permanece na página de login

  Scenario: Login com senha incorreta
    Given que o usuário "alice" existe
    When o usuário preenche o formulário com "alice" como identificador e uma senha incorreta
    And clica no botão de login
    Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"
    And o usuário permanece na página de login

  Scenario: Login com usuário inexistente
    When o usuário preenche o formulário com um identificador que não existe
    And clica no botão de login
    Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"
    And o usuário permanece na página de login

  Scenario: Bloquear após 3 tentativas erradas em 10 minutos
    Given que o usuário "alice" realizou 3 tentativas de login fracassadas nos últimos 10 minutos
    When o usuário tenta fazer login novamente
    Then o sistema exibe mensagem de bloqueio "Muitas tentativas fracassadas. Tente novamente em 15 minutos"
    And o identificador "alice" é bloqueado por 15 minutos
    And o usuário não consegue fazer login

  Scenario: Tentar login durante período de bloqueio
    Given que o identificador "alice" está bloqueado por tentativas erradas
    When o usuário tenta fazer login com "alice"
    And clica no botão de login
    Then o sistema exibe mensagem de bloqueio "Muitas tentativas fracassadas. Tente novamente em 15 minutos"
    And o usuário não consegue fazer login

  Scenario: Desbloquear automaticamente após 15 minutos
    Given que o identificador "alice" está bloqueado e o período de 15 minutos expirou
    When o usuário tenta fazer login com "alice" e uma senha válida
    And clica no botão de login
    Then o sistema remove o bloqueio
    And o sistema reseta o contador de tentativas fracassadas
    And o usuário consegue fazer login com sucesso

  Scenario: Email de aviso para senha incorreta
    Given que o usuário "alice" existe com email "alice@example.com" cadastrado
    When o usuário preenche o formulário com "alice" como identificador e uma senha incorreta
    And clica no botão de login
    Then o sistema envia um email de aviso para "alice@example.com" alertando sobre a tentativa de login falhada
    And o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"
    And o usuário permanece na página de login

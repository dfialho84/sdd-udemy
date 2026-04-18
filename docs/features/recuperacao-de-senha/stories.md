# Estórias de Usuário — Recuperação de Senha

## Estoria 1 – Solicitar recuperação de senha por email

Como usuário com cadastro ativo que esqueceu sua senha
Eu quero solicitar recuperação de senha informando meu email
Para que eu receba um link seguro para redefinir minha senha

_Critérios de aceitação_:

- O sistema deve exibir um formulário com campo de email ao clicar em "Esqueci a senha" na tela de login
- O sistema deve aceitar um email válido e exibir mensagem de confirmação
- O sistema deve validar o formato do email antes de processar a solicitação
- O sistema deve aceitar solicitações apenas de emails associados a contas ativas

## Estoria 2 – Receber link de recuperação válido

Como usuário com cadastro ativo que esqueceu sua senha
Eu quero receber um link único de recuperação via email
Para que eu possa redefinir minha senha de forma segura

_Critérios de aceitação_:

- O sistema deve gerar um token único com expiração de 12 horas
- O sistema deve enviar um email contendo um link válido com o token
- O sistema deve invalidar o token após a primeira utilização
- O sistema deve usar HTTPS e nunca expor o token completo em logs

## Estoria 3 – Redefinir senha através do link

Como usuário com cadastro ativo que clicou em um link válido de recuperação
Eu quero redefinir minha senha informando uma nova senha
Para que eu possa acessar minha conta novamente

_Critérios de aceitação_:

- O sistema deve exibir uma tela de redefinição de senha após validar o token
- O sistema deve exigir confirmação de senha (campo repetição)
- O sistema deve validar força/complexidade da nova senha
- O sistema deve atualizar a senha no banco de dados e invalidar a sessão anterior
- O sistema deve exibir mensagem de sucesso e redirecionar para tela de login

## Estoria 4 – Rejeitar email não encontrado sem revelar informação

Como usuário que tenta solicitar recuperação com um email não registrado
Eu quero receber a mesma mensagem genérica que receberia se a conta existisse
Para que terceiros não consigam usar o formulário para descobrir quais emails estão cadastrados

_Critérios de aceitação_:

- O sistema deve exibir a mensagem "Se existe conta com esse email, você receberá um link de recuperação"
- O sistema deve não enviar email se o email não estiver associado a nenhuma conta
- O sistema deve oferecer um link para a página de cadastro na mensagem
- O sistema deve registrar tentativas de recuperação com emails inexistentes (para auditoria)

## Estoria 5 – Caso de falha: link expirado

Como usuário que tenta acessar um link de recuperação após 12 horas
Eu quero ser informado que o link expirou
Para que eu possa solicitar um novo link de recuperação

_Critérios de aceitação_:

- O sistema deve detectar expiração do token e exibir mensagem de erro clara
- O sistema deve redirecionar para a página de recuperação
- O sistema deve oferecer opção de solicitar novo link na mesma página
- O sistema deve não permitir redefinição com token expirado

## Estoria 6 – Caso de falha: token inválido

Como usuário que tenta acessar um link com token malformado ou inválido
Eu quero ser informado que o link é inválido
Para que eu saiba que algo deu errado e possa solicitar um novo link

_Critérios de aceitação_:

- O sistema deve validar o formato do token na URL
- O sistema deve rejeitar tokens malformados ou não reconhecidos
- O sistema deve exibir mensagem de erro apropriada
- O sistema deve redirecionar para a página de recuperação com a mensagem

## Estoria 7 – Rate limiting na solicitação de recuperação

Como um sistema de proteção contra ataques de força bruta
Eu quero limitar o número de solicitações de recuperação por IP a 5 por hora
Para que o sistema não seja explorado para enumerar ou ataques contra contas

_Critérios de aceitação_:

- O sistema deve permitir no máximo 5 tentativas de recuperação por IP por hora
- O sistema deve exibir mensagem "Muitas tentativas de recuperação. Tente novamente em 1 hora" após atingir o limite
- O sistema deve registrar tentativas bloqueadas em logs de segurança
- O sistema deve desbloquear automaticamente após 1 hora

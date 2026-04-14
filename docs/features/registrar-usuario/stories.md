# Estórias de Usuário — Registrar Usuario

## Estoria 1 – Preencher formulário de cadastro

Como visitante da plataforma sem conta cadastrada
Eu quero preencher um formulário com meus dados pessoais, incluindo um nome de usuário único, para criar minha conta
Para que eu possa ter acesso à plataforma sem depender de intervenção administrativa

_Critérios de aceitação_:

- O sistema deve exibir o formulário de cadastro com os campos nome, username, email, senha, confirmação de senha, foto de perfil e data de nascimento
- O sistema deve permitir o envio do formulário somente quando todos os campos obrigatórios estiverem preenchidos, incluindo username
- O sistema deve criar o cadastro com status "pendente" e enviar um email de confirmação ao endereço informado após o envio válido do formulário
- O sistema deve exibir uma tela informando que um link de confirmação foi enviado ao email cadastrado

## Estoria 2 – Validar dados do formulário

Como visitante da plataforma sem conta cadastrada
Eu quero ser informado quando os dados do formulário estiverem incorretos ou incompletos
Para que eu possa corrigir os erros antes de concluir o cadastro

_Critérios de aceitação_:

- O sistema deve rejeitar o envio quando o username já estiver associado a uma conta existente, exibindo mensagem de erro específica
- O sistema deve rejeitar o envio quando o email informado já estiver associado a uma conta existente, exibindo mensagem de erro específica
- O sistema deve rejeitar o envio quando a senha não atender à política de segurança (mínimo de 8 caracteres contendo letras maiúsculas, minúsculas, números e caracteres especiais), exibindo mensagem de erro específica
- O sistema deve rejeitar o envio quando a confirmação de senha não for idêntica à senha informada, exibindo mensagem de erro específica
- O sistema não deve criar nenhum cadastro quando houver erro de validação

## Estoria 3 – Confirmar cadastro via link de email

Como visitante com cadastro pendente de confirmação
Eu quero clicar no link enviado ao meu email para confirmar minha identidade
Para que minha conta seja ativada e eu possa acessar o sistema

_Critérios de aceitação_:

- O sistema deve ativar a conta do visitante ao receber um clique em um link de confirmação válido e não expirado
- O sistema deve redirecionar o navegador para a página HTML `/confirm` exibindo mensagem de sucesso e um link para acessar o sistema após a ativação da conta
- O sistema deve invalidar o link de confirmação imediatamente após o primeiro uso bem-sucedido, impedindo reativações duplicadas

## Estoria 4 – Caso de falha: link de confirmação expirado

Como visitante com cadastro pendente de confirmação
Eu quero ser informado quando o link de confirmação que recebi não for mais válido
Para que eu saiba que preciso iniciar o cadastro novamente

_Critérios de aceitação_:

- O sistema deve rejeitar o link de confirmação quando ele tiver sido gerado há mais de 24 horas
- O sistema deve deletar automaticamente o cadastro pendente associado ao link expirado
- O sistema deve exibir mensagem informando que o link expirou e que o visitante deve realizar o cadastro novamente
- O sistema deve redirecionar o visitante para a página de cadastro após exibir a mensagem de link expirado

# Estórias de Usuário — Login

## Estoria 1 – Realizar login com credenciais válidas

Como usuário com conta ativa
Eu quero autenticar-me usando meu identificador (usuário ou email) e senha
Para que eu possa acessar minha área pessoal

_Critérios de aceitação_:

- O sistema deve exibir o formulário de login com campos para identificador e senha
- O sistema deve validar as credenciais contra o banco de dados quando o formulário é submetido
- O sistema deve criar uma sessão autenticada após validação bem-sucedida
- O sistema deve redirecionar o usuário para /users/<id-do-usuario> após autenticação bem-sucedida

## Estoria 2 – Rejeitar credenciais inválidas

Como usuário com conta ativa
Eu quero receber uma mensagem clara quando minhas credenciais estão erradas
Para que eu saiba que preciso tentar novamente com os dados corretos

_Critérios de aceitação_:

- O sistema deve exibir mensagem de erro genérica ("Usuário ou senha incorretos") sem revelar se a conta existe
- O sistema deve manter o usuário na página de login após rejeição
- O sistema deve permitir que o usuário tente fazer login novamente
- O sistema deve validar identificador vazio como credencial inválida
- O sistema deve enviar um email de aviso para o endereço cadastrado quando o identificador informado corresponder a uma conta existente, mas a senha estiver incorreta

## Estoria 3 – Bloquear após múltiplas tentativas fracassadas

Como usuário com conta ativa
Eu quero que minha conta seja protegida automaticamente após várias tentativas erradas
Para que minha conta não seja comprometida por ataques de força bruta

_Critérios de aceitação_:

- O sistema deve permitir até 3 tentativas de login fracassadas em uma janela de 10 minutos por identificador
- O sistema deve registrar cada tentativa de login fracassada com timestamp e identificador
- O sistema deve bloquear o identificador por 15 minutos após atingir o limite de 3 tentativas
- O sistema deve exibir mensagem de bloqueio informando ao usuário que deve aguardar antes de tentar novamente

## Estoria 4 – Acessar login após período de cooldown

Como usuário com conta ativa que foi bloqueado temporariamente
Eu quero tentar fazer login novamente após 15 minutos de espera
Para que eu possa acessar minha conta quando o período de bloqueio expirar

_Critérios de aceitação_:

- O sistema deve remover automaticamente o bloqueio após 15 minutos desde a ativação do bloqueio
- O sistema deve permitir que o usuário tente fazer login novamente após o desbloqueio automático
- O sistema deve resetar o contador de tentativas fracassadas após o desbloqueio
- O sistema deve exibir o formulário de login normal (sem mensagem de bloqueio) após expiração do período de cooldown

# PRD — Login

## Visão Geral

Permitir que um usuário previamente cadastrado acesse a plataforma
autenticando-se com seu identificador (usuário ou email) e senha,
iniciando uma sessão válida no sistema.

Após autenticação bem-sucedida, o usuário será redirecionado para
sua área pessoal sem precisar autenticar-se novamente a cada requisição.

---

## Problema

Usuários cadastrados atualmente não possuem um mecanismo formal
de autenticação na plataforma.

Sem autenticação, funcionalidades restritas não podem ser protegidas
adequadamente e o sistema não consegue garantir que apenas usuários
autorizados executem determinadas ações.

Além disso, a ausência de sessões persistentes prejudica a experiência
do usuário durante o uso contínuo do sistema.

---

## Usuário-Alvo

Usuários com status "ativo" que possuam uma conta previamente criada
via a feature de registro (register-user). Usuários com status "pending"
(cadastro não confirmado) não podem acessar esta feature.

---

## Objetivos

1. Permitir que um usuário se autentique utilizando seu identificador (usuário ou email) e senha.
2. Criar uma sessão autenticada válida após a verificação das credenciais.
3. Rejeitar tentativas de autenticação com credenciais inválidas.
4. Redirecionar o usuário para sua área pessoal após autenticação bem-sucedida.
5. Registrar todas as tentativas de login (bem-sucedidas e fracassadas) em log estruturado.
6. Aplicar mecanismos de proteção contra força bruta em tentativas de autenticação.

---

## Critérios de Sucesso

| Critério | Medida |
| --- | --- |
| Usuário consegue acessar o sistema após login válido | 100% dos logins válidos resultam em sessão ativa |
| Credenciais inválidas são rejeitadas | Sistema retorna erro genérico sem expor dados |
| Sessão permanece ativa durante uso normal | Usuário não precisa autenticar-se novamente |
| Proteção contra força bruta ativada | Após 3 tentativas erradas em 10 minutos, bloqueio ativado |
| Tentativas registradas em log | Todos os logins (sucesso/falha) registrados |

---

## Fora do Escopo

- Recuperação ou redefinição de senha
- Logout explícito do sistema
- Autenticação multifator (MFA)
- Login com provedores sociais (Google, Facebook, etc.)
- Confirmação ou verificação de email/telefone durante login
- Controle de múltiplas sessões simultâneas
- Sincronização de sessão entre múltiplos dispositivos

---

## Fluxo Principal

```
Usuário clica no link "Entrar" na página inicial
→ Sistema exibe formulário de login
→ Usuário preenche identificador (usuário ou email) e senha
→ Usuário submete o formulário
→ Sistema valida as credenciais contra o banco de dados
→ Sistema cria uma sessão autenticada
→ Usuário é redirecionado para /users/<id-do-usuario>
```

---

## Fluxo Alternativo

### Credenciais inválidas

```
Usuário envia credenciais incorretas
→ Sistema rejeita autenticação
→ Mensagem de erro genérica é exibida ("Usuário ou senha incorretos")
→ Usuário permanece na página de login e pode tentar novamente
```

### Proteção contra força bruta ativada

```
Após 3 tentativas erradas em 10 minutos
→ Sistema bloqueia novas tentativas de login para esse identificador por 15 minutos
→ Mensagem de bloqueio é exibida ao usuário
→ Usuário deve aguardar o período de bloqueio expirar
```

---

## Dependências

- Feature `register-user` (usuários precisam estar cadastrados com status "ativo")
- Banco de dados MySQL com tabela de usuários contendo campos de identificação e senha
- Sistema de log estruturado para registrar tentativas de autenticação

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| Tentativas repetidas de login com credenciais inválidas (força bruta) | Aplicar limite de 3 tentativas em 10 minutos com bloqueio de 15 minutos |
| Exposição de dados sensíveis em mensagens de erro | Retornar mensagem genérica ("Usuário ou senha incorretos") sem expor se existe a conta |
| Sessão inválida permitindo acesso indevido | Validar sessão a cada acesso a recursos protegidos |
| Falsos positivos (bloqueio de usuários legítimos) | Implementar desbloqueio manual ou automático após período de espera |
| Degradação de performance sob carga alta de logins | Implementar cache e otimizações para validação de credenciais |

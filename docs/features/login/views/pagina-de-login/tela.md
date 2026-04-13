# Página de Login

## Visão Geral

- **Nome**: Página de Login
- **Slug**: `pagina-de-login`
- **URL**: —
- **Objetivo**: Permite que o usuário acesse a plataforma informando seu identificador (nome de usuário ou email) e senha. Após validação bem-sucedida, o usuário é redirecionado para sua área pessoal.
- **Scenarios relacionados**:
    - Login bem-sucedido com usuário
    - Login bem-sucedido com email
    - Login com identificador vazio
    - Login com senha incorreta
    - Login com usuário inexistente
    - Bloquear após 3 tentativas erradas em 10 minutos
    - Tentar login durante período de bloqueio
    - Desbloquear automaticamente após 15 minutos
    - Email de aviso para senha incorreta

## Componentes

### Campos de formulário

| Campo         | Tipo     | Obrigatório | Descrição                                       |
| ------------- | -------- | ----------- | ----------------------------------------------- |
| Identificador | text     | Sim         | Nome de usuário ou endereço de email do usuário |
| Senha         | password | Sim         | Senha associada à conta do usuário              |

### Botões

| Rótulo | Tipo   | Comportamento                                                                                                                  |
| ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Login  | submit | Submete as credenciais; o sistema valida e, se corretas, cria sessão autenticada e redireciona o usuário para sua área pessoal |

### Conteúdo e mensagens fixas

- Título ou cabeçalho identificando a tela como área de autenticação (texto exato não especificado nos artefatos)

## Estados

### Padrão (initial)

O usuário vê o formulário com os campos de identificador e senha vazios, prontos para preenchimento.

### Carregamento (loading)

Após clicar no botão "Login", o sistema processa a validação das credenciais. O usuário aguarda a resposta enquanto a requisição é processada.

### Erro

| Causa                                                       | Mensagem exibida                                                 |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Identificador vazio, senha incorreta ou usuário inexistente | `"Usuário ou senha incorretos"`                                  |
| Identificador bloqueado por tentativas fracassadas          | `"Muitas tentativas fracassadas. Tente novamente em 15 minutos"` |

### Sucesso

O sistema cria uma sessão autenticada e redireciona o usuário para sua área pessoal (`/users/<id-do-usuario>`).

## Considerações

### Validações

- **Identificador**: campo obrigatório; não pode ser submetido vazio (REQ-6)
- **Senha**: campo obrigatório
- **Bloqueio de identificador**: após 3 tentativas fracassadas em uma janela de 10 minutos, o identificador é bloqueado por 15 minutos e novas tentativas são rejeitadas independentemente das credenciais informadas (REQ-8, REQ-9, REQ-11)

### Acessibilidade

Não há requisitos ou menções explícitas de acessibilidade nos artefatos desta feature.

### Responsividade

Não há requisitos ou menções explícitas de responsividade nos artefatos desta feature.

## Referências Visuais

### Prototipo

O pagina deve ser fiel ao prototipo em @docs/features/login/views/pagina-de-login/login page.png

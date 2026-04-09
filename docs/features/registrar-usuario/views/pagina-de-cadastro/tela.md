# Pagina de Cadastro

## Visao Geral

- **Nome:** Pagina de Cadastro
- **Slug:** pagina-de-cadastro
- **URL:** /register
- **Objetivo:** Permitir que um visitante crie uma nova conta informando seus dados pessoais e credenciais de acesso.
- **Scenarios relacionados:**
  - Acessar formulario de cadastro via link na home
  - Cadastro realizado com dados validos
  - Cadastro com dados invalidos no formulario

## Componentes

### Campos de formulario

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| Nome | text | Sim | Nome completo do visitante |
| Email | email | Sim | Endereco de email para login e confirmacao |
| Senha | password | Sim | Senha de acesso — minimo 8 caracteres com maiusculas, minusculas, numeros e caracteres especiais |
| Confirmacao de senha | password | Sim | Repeticao da senha para verificacao |
| Data de nascimento | date | Sim | Data de nascimento do visitante |
| Foto de perfil | file | Nao | Imagem opcional para avatar do usuario |

### Botoes

| Rotulo | Tipo | Comportamento |
|---|---|---|
| Cadastrar | submit | Valida os campos e envia o formulario; em caso de sucesso leva o visitante para a tela de confirmacao de envio de email |

### Links de navegacao

| Rotulo | Destino | Contexto |
|---|---|---|
| Criar conta (origem) | /register (esta tela) | Link presente na pagina inicial que conduz o visitante a esta tela |

### Conteudo e mensagens fixas

- Titulo da pagina — a confirmar com design
- Instrucao sobre requisitos de senha (derivada da mensagem de erro: minimo 8 caracteres com maiusculas, minusculas, numeros e caracteres especiais)

## Estados

### Padrao (initial)

Formulario exibido com todos os campos vazios e o botao "Cadastrar" habilitado. Campo de foto de perfil sem imagem pre-selecionada.

### Carregamento (loading)

Exibido apos o visitante submeter o formulario com dados validos, enquanto o sistema processa o cadastro e dispara o envio do email de confirmacao. O botao "Cadastrar" fica desabilitado durante o processamento para evitar duplo envio.

### Erro

| Causa | Mensagem exibida |
|---|---|
| Email ja associado a uma conta existente | `Este email ja esta cadastrado. Tente fazer login ou use outro endereco.` |
| Senha sem caractere especial | `A senha deve ter no minimo 8 caracteres, incluindo maiusculas, minusculas, numeros e caracteres especiais.` |
| Confirmacao de senha diferente da senha informada | `As senhas nao coincidem.` |
| Nome em branco | `O campo nome e obrigatorio.` |
| Data de nascimento em branco | `O campo data de nascimento e obrigatorio.` |
| Email com formato invalido | `Informe um endereco de email valido.` |

### Sucesso

O visitante e levado para a tela de email enviado, que informa que um link de confirmacao foi enviado ao endereco de email informado. Nenhum cadastro ativo e criado neste momento — o status do registro e "pendente" ate a confirmacao.

## Consideracoes

### Validacoes

- **Nome:** campo obrigatorio; nao pode estar em branco
- **Email:** formato valido de endereco de email; nao pode estar ja cadastrado no sistema
- **Senha:** minimo 8 caracteres, incluindo letras maiusculas, minusculas, numeros e caracteres especiais
- **Confirmacao de senha:** deve ser identica ao campo senha
- **Data de nascimento:** campo obrigatorio; nao pode estar em branco
- **Foto de perfil:** campo opcional; nenhuma validacao de obrigatoriedade

### Acessibilidade

Nao especificado nos artefatos atuais. A preencher quando houver requisito nao funcional correspondente.

### Responsividade

Nao especificado nos artefatos atuais. A preencher quando houver requisito nao funcional correspondente.

## Referencias Visuais

### Wireframe
_A preencher manualmente._

### Mockup
_A preencher manualmente._

### Prototipo interativo
_A preencher manualmente._

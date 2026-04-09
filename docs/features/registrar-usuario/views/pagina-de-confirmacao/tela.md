# Pagina de Confirmacao

## Visao Geral

- **Nome:** Pagina de Confirmacao
- **Slug:** pagina-de-confirmacao
- **URL:** /confirm
- **Objetivo:** Apresentar ao visitante o resultado do clique no link de confirmacao de cadastro, informando se a conta foi ativada com sucesso, se o link expirou ou se o link ja foi utilizado anteriormente.
- **Scenarios relacionados:**
  - Confirmacao de conta via link valido
  - Confirmacao de cadastro com link expirado
  - Confirmacao de cadastro com link ja utilizado

## Componentes

### Links de navegacao

| Rotulo | Destino | Contexto |
|---|---|---|
| Link para acessar o sistema | a confirmar com design | Exibido quando a conta foi ativada com sucesso |
| Link para a pagina de cadastro | /register | Exibido quando o link de confirmacao esta expirado |

### Conteudo e mensagens fixas

- Mensagem de resultado da confirmacao — varia conforme o estado da pagina (ver secao Estados)

## Estados

### Padrao (initial)

A pagina e acessada exclusivamente por meio do link de confirmacao enviado por email. O conteudo exibido depende do estado do link utilizado (ver estados abaixo).

### Sucesso

Exibido quando o visitante acessa um link de confirmacao valido e nao expirado pela primeira vez.

- Mensagem informando que a conta foi ativada com sucesso
- Link para acessar o sistema apresentado ao visitante

Derivado de: `Then o visitante ve a pagina de confirmacao "/confirm" com mensagem de sucesso informando que a conta foi ativada` / `And um link para acessar o sistema e apresentado ao visitante na pagina "/confirm"`

### Erro

| Causa | Mensagem exibida |
|---|---|
| Link de confirmacao expirado (mais de 24 horas desde a criacao) | `o link expirou e que o cadastro deve ser realizado novamente` |
| Link de confirmacao ja utilizado anteriormente | `o link de confirmacao ja foi utilizado` |

> Nota: as mensagens acima sao derivadas dos `Then` dos Scenarios; o texto exato de exibicao na interface deve ser alinhado com o design, mantendo o conteudo semantico dos cenarios.

### Erro — Link expirado

Exibido quando o visitante acessa um link de confirmacao gerado ha mais de 24 horas.

- Mensagem informando que o link expirou e que o visitante deve realizar o cadastro novamente
- Link para a pagina de cadastro (`/register`) apresentado ao visitante
- O cadastro pendente associado ao link e removido automaticamente pelo sistema (nao exibe confirmacao dessa remocao ao usuario)

Derivado de: `Then o visitante ve a pagina de confirmacao "/confirm" com mensagem informando que o link expirou e que o cadastro deve ser realizado novamente` / `And a pagina "/confirm" apresenta um link para a pagina de cadastro`

### Erro — Link ja utilizado

Exibido quando o visitante tenta acessar um link de confirmacao que ja foi usado anteriormente para ativar a conta.

- Mensagem informando que o link de confirmacao ja foi utilizado
- O status da conta nao e alterado pelo sistema

Derivado de: `Then o visitante ve a pagina de confirmacao "/confirm" com mensagem informando que o link de confirmacao ja foi utilizado`

## Consideracoes

### Outros

- Esta pagina e uma pagina HTML estatica no caminho `/confirm`, conforme o PRD (Fluxo Principal e Fluxo Alternativo)
- O link de confirmacao e invalidado imediatamente apos o primeiro uso bem-sucedido, impedindo reativacoes duplicadas (REQ-14)
- O reenvio do email de confirmacao nao esta disponivel — se o link expirar, o visitante deve reiniciar o cadastro do zero (PRD, secao "Fora do Escopo")
- A URL de destino do "link para acessar o sistema" (estado de sucesso) nao esta determinada nos artefatos desta feature — pertence a feature de login

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

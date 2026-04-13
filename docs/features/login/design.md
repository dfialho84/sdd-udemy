# Design — Login

## Visão Geral Técnica

A autenticação de usuários usa next-auth para gerenciamento de sessão, com verificação de credenciais implementada no Domain via comparação de hash bcrypt. O controle de força bruta é implementado com contadores de tentativas persistidos em MySQL, usando janela deslizante de 10 minutos e bloqueio automático de 15 minutos por identificador (REQ-8, REQ-9). Notificações de falha de autenticação são enviadas por email via adaptador de infraestrutura isolado (Mailhog em desenvolvimento), e todas as tentativas geram log estruturado JSON via OpenTelemetry conforme exigido pela constitution.md.

---

## Arquitetura de Componentes

### LoginRouteHandler
- **Camada:** adapter (transporte — `app/api/auth/[...nextauth]/route.ts`)
- **Responsabilidade:** Receber requisições HTTP de autenticação via next-auth, validar payload de entrada e delegar ao `AuthenticateUserUseCase` via Port
- **Depende de:** `AuthenticateUserUseCase` (Port inbound)

### LoginPage
- **Camada:** adapter (UI — `app/(auth)/login/page.tsx`)
- **Responsabilidade:** Renderizar o formulário de login com campos `identifier` e `password`; exibir mensagens de erro de autenticação retornadas pelo next-auth
- **Depende de:** next-auth (`signIn`), React Hook Form, Zod

### AuthenticateUserUseCase
- **Camada:** domain (caso de uso)
- **Responsabilidade:** Orquestrar o fluxo de autenticação: verificar bloqueio, buscar usuário, comparar senha, registrar tentativa, emitir notificação de email quando aplicável; não depende de frameworks
- **Depende de:** `UserRepository` (Port outbound), `LoginAttemptRepository` (Port outbound), `EmailNotificationPort` (Port outbound)

### LoginDomain
- **Camada:** domain (regras de negócio)
- **Responsabilidade:** Encapsular regras de negócio: validação de bloqueio por janela deslizante (10 min / 3 tentativas), cálculo de expiração do bloqueio (15 min), determinação se notificação de email deve ser enviada
- **Depende de:** — (sem dependências externas)

### UserRepository
- **Camada:** infrastructure (adapter de persistência)
- **Responsabilidade:** Buscar usuário por `username` ou `email` com status "ativo" via Drizzle + MySQL
- **Depende de:** Drizzle, MySQL

### LoginAttemptRepository
- **Camada:** infrastructure (adapter de persistência)
- **Responsabilidade:** Persistir tentativas de autenticação (timestamp, identifier, resultado), consultar contagem dentro da janela deslizante de 10 minutos, registrar e remover bloqueios ativos por identificador
- **Depende de:** Drizzle, MySQL

### EmailNotificationAdapter
- **Camada:** infrastructure (adapter externo)
- **Responsabilidade:** Enviar email de aviso de tentativa de login com senha incorreta para o endereço cadastrado do usuário (REQ-14, NFR-8) — *novo, requer configuração Mailhog/SMTP*
- **Depende de:** Nodemailer ou cliente SMTP (Mailhog em desenvolvimento)

### NextAuthSessionAdapter
- **Camada:** infrastructure (adapter de sessão)
- **Responsabilidade:** Integrar com next-auth para criação e gestão de sessão autenticada após credenciais válidas (REQ-3)
- **Depende de:** next-auth

---

## Modelo de Dados

### User (existente — feature `register-user`)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único do usuário |
| username | string | Nome de usuário para autenticação |
| email | string | Email para autenticação |
| password_hash | string | Hash bcrypt da senha |
| status | enum | `active` \| `pending` — apenas `active` pode autenticar |
| created_at | timestamp | Data de criação da conta |

> Esta feature não altera a estrutura da tabela `users` — apenas realiza leitura.

### LoginAttempt
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único da tentativa |
| identifier | string | Valor submetido no campo de identificador (username ou email) |
| success | boolean | `true` se autenticação bem-sucedida; `false` se fracassada |
| created_at | timestamp | Timestamp da tentativa — usado para janela deslizante de 10 min (REQ-8, NFR-7) |

**Relações:** Sem chave estrangeira para `users` — o identifier pode não corresponder a nenhum usuário existente (REQ-13 exige registro mesmo para identificadores inexistentes).

### LoginBlock
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Identificador único do bloqueio |
| identifier | string | Identificador bloqueado (username ou email) |
| blocked_until | timestamp | Momento de expiração do bloqueio — ativação + 15 min (REQ-9, REQ-12) |
| created_at | timestamp | Timestamp de ativação do bloqueio |

**Relações:** Nenhuma — bloqueio é resolvido por `identifier` (string). Um identificador tem no máximo um bloqueio ativo por vez.

---

## API / Contratos

### POST /api/auth/callback/credentials
- **Autenticação:** pública
- **Descrição:** Endpoint gerenciado pelo next-auth para autenticação com credenciais. Recebe `identifier` e `password`, executa o `authorize` callback que delega ao `AuthenticateUserUseCase`.
- **Request body:**
  ```json
  {
    "identifier": "string",
    "password": "string",
    "csrfToken": "string"
  }
  ```
- **Response 200** (autenticação bem-sucedida — REQ-2, REQ-3): sessão criada; next-auth redireciona para `/users/<id>` (REQ-4, stories.md Estoria 1).
- **Erros:**
  | Código | Condição |
  |--------|----------|
  | 401 | Credenciais inválidas: identifier vazio, senha incorreta ou usuário inexistente — mensagem genérica "Usuário ou senha incorretos" (REQ-5, REQ-6, NFR-6) |
  | 429 | Identificador bloqueado por tentativas excessivas — mensagem "Muitas tentativas fracassadas. Tente novamente em 15 minutos" (REQ-9, REQ-10, REQ-11, NFR-3, NFR-4) |

> Todos os erros seguem a estrutura padronizada: `{ código, mensagem, requestId, timestamp }` (constitution.md, regra 5).

---

## Fluxo de Execução

### Fluxo: Login bem-sucedido com usuário

1. **LoginPage** renderiza formulário com campos `identifier` e `password` (REQ-1)
2. Usuário preenche `identifier = "alice"` e senha correta, clica em submit
3. **LoginPage** chama `signIn("credentials", { identifier, password })` via next-auth
4. **LoginRouteHandler** recebe `POST /api/auth/callback/credentials`; valida que `identifier` e `password` estao presentes e nao sao vazios
5. **LoginRouteHandler** invoca `AuthenticateUserUseCase.execute({ identifier, password })`
6. **AuthenticateUserUseCase** chama `LoginAttemptRepository.findActiveBlock(identifier)` — nenhum bloqueio ativo
7. **AuthenticateUserUseCase** chama `UserRepository.findByIdentifier("alice")` — retorna usuario com status `active`
8. **AuthenticateUserUseCase** chama `LoginDomain.verifyPassword(password, user.password_hash)` via bcrypt — senha confere
9. **AuthenticateUserUseCase** chama `LoginAttemptRepository.save({ identifier, success: true, created_at: now })` (REQ-13, NFR-7)
10. **AuthenticateUserUseCase** retorna objeto de sessao com `{ id, username, email }` para o next-auth `authorize` callback
11. **NextAuthSessionAdapter** cria sessao autenticada com os dados do usuario (REQ-3)
12. **LoginRouteHandler** retorna `200 OK`; next-auth redireciona para `/users/<id>` (REQ-4)

---

### Fluxo: Login bem-sucedido com email

Identico ao fluxo anterior, com `identifier = "alice@example.com"`. No passo 7, `UserRepository.findByIdentifier` busca pelo campo `email` em vez de `username`.

---

### Fluxo: Login com identificador vazio

1. **LoginPage** renderiza formulário; usuario submete com `identifier` vazio
2. **LoginPage** chama `signIn("credentials", { identifier: "", password })`
3. **LoginRouteHandler** recebe `POST /api/auth/callback/credentials`; detecta `identifier` vazio na validacao de entrada
4. **LoginRouteHandler** retorna `401` com mensagem "Usuário ou senha incorretos" (REQ-6, NFR-6)
5. **LoginPage** exibe mensagem de erro genérica; usuario permanece na pagina de login (REQ-7)

---

### Fluxo: Login com senha incorreta

1. **LoginPage** renderiza formulário; usuario submete `identifier = "alice"` e senha incorreta
2. **LoginRouteHandler** valida payload (nao vazio) e invoca `AuthenticateUserUseCase.execute({ identifier, password })`
3. **AuthenticateUserUseCase** chama `LoginAttemptRepository.findActiveBlock("alice")` — sem bloqueio
4. **AuthenticateUserUseCase** chama `UserRepository.findByIdentifier("alice")` — usuario encontrado com status `active`
5. **AuthenticateUserUseCase** chama `LoginDomain.verifyPassword(password, user.password_hash)` — senha nao confere
6. **AuthenticateUserUseCase** chama `LoginAttemptRepository.save({ identifier: "alice", success: false, created_at: now })` (REQ-13)
7. **AuthenticateUserUseCase** chama `EmailNotificationAdapter.sendWarning(user.email)` — usuario existe e senha incorreta (REQ-14, NFR-8)
8. **AuthenticateUserUseCase** lanca erro de autenticacao
9. **LoginRouteHandler** captura o erro e retorna `401` com mensagem genérica "Usuário ou senha incorretos" (REQ-5, NFR-6)
10. **LoginPage** exibe mensagem de erro; usuario permanece na pagina de login (REQ-7)

---

### Fluxo: Login com usuário inexistente

1. **LoginPage** submete `identifier` que nao existe
2. **LoginRouteHandler** valida payload e invoca `AuthenticateUserUseCase.execute({ identifier, password })`
3. **AuthenticateUserUseCase** chama `LoginAttemptRepository.findActiveBlock(identifier)` — sem bloqueio
4. **AuthenticateUserUseCase** chama `UserRepository.findByIdentifier(identifier)` — retorna null
5. **AuthenticateUserUseCase** chama `LoginAttemptRepository.save({ identifier, success: false, created_at: now })` (REQ-13)
6. **AuthenticateUserUseCase** lanca erro de autenticacao **sem** chamar `EmailNotificationAdapter` (conta nao existe — REQ-14 nao se aplica)
7. **LoginRouteHandler** retorna `401` com mensagem genérica "Usuário ou senha incorretos" (REQ-5, NFR-6)
8. **LoginPage** exibe mensagem de erro; usuario permanece na pagina de login (REQ-7)

---

### Fluxo: Bloquear após 3 tentativas erradas em 10 minutos

1. Dado que "alice" ja tem 3 registros em `LoginAttempt` com `success: false` nos ultimos 10 minutos
2. **LoginRouteHandler** recebe nova tentativa e invoca `AuthenticateUserUseCase.execute({ identifier: "alice", password })`
3. **AuthenticateUserUseCase** chama `LoginAttemptRepository.countRecentFailures("alice", window: 10min)` — retorna 3
4. **LoginDomain** avalia: limite de 3 atingido — ativa bloqueio
5. **AuthenticateUserUseCase** chama `LoginAttemptRepository.createBlock({ identifier: "alice", blocked_until: now + 15min })` (REQ-9)
6. **AuthenticateUserUseCase** lanca erro de bloqueio
7. **LoginRouteHandler** retorna `429` com mensagem "Muitas tentativas fracassadas. Tente novamente em 15 minutos" (REQ-10)
8. **LoginPage** exibe mensagem de bloqueio; usuario nao consegue fazer login (REQ-11)

---

### Fluxo: Tentar login durante período de bloqueio

1. Dado que "alice" esta bloqueado (`LoginBlock.blocked_until > now`)
2. **LoginRouteHandler** recebe tentativa e invoca `AuthenticateUserUseCase.execute({ identifier: "alice", password })`
3. **AuthenticateUserUseCase** chama `LoginAttemptRepository.findActiveBlock("alice")` — retorna bloqueio ativo
4. **LoginDomain** avalia: `blocked_until > now` — bloqueio ainda vigente (REQ-11)
5. **AuthenticateUserUseCase** lanca erro de bloqueio sem verificar senha
6. **LoginRouteHandler** retorna `429` com mensagem "Muitas tentativas fracassadas. Tente novamente em 15 minutos" (REQ-10, REQ-11)
7. **LoginPage** exibe mensagem de bloqueio; usuario nao consegue fazer login

---

### Fluxo: Desbloquear automaticamente após 15 minutos

1. Dado que "alice" esta bloqueado mas `LoginBlock.blocked_until < now` (periodo expirou)
2. **LoginRouteHandler** recebe tentativa com senha valida e invoca `AuthenticateUserUseCase.execute({ identifier: "alice", password })`
3. **AuthenticateUserUseCase** chama `LoginAttemptRepository.findActiveBlock("alice")` — bloco encontrado mas `blocked_until < now` — bloqueio expirado
4. **AuthenticateUserUseCase** chama `LoginAttemptRepository.removeBlock("alice")` — remove o bloqueio (REQ-12)
5. **AuthenticateUserUseCase** chama `LoginAttemptRepository.resetFailureCount("alice")` — zera contador de falhas (REQ-12)
6. Fluxo continua como login bem-sucedido (passos 7-12 do fluxo principal)

---

### Fluxo: Email de aviso para senha incorreta

1. Dado que "alice" existe com email "alice@example.com" cadastrado
2. Usuario submete `identifier = "alice"` e senha incorreta
3. Fluxo segue os passos 1-6 do "Login com senha incorreta"
4. No passo 7: **AuthenticateUserUseCase** chama `EmailNotificationAdapter.sendWarning("alice@example.com")` (REQ-14)
5. **EmailNotificationAdapter** envia email de aviso via SMTP (Mailhog em dev) dentro de 5 minutos (NFR-8)
6. **LoginRouteHandler** retorna `401` com mensagem genérica (REQ-5); o envio do email ocorre de forma assincrona, nao bloqueando a resposta HTTP
7. **LoginPage** exibe "Usuário ou senha incorretos"; usuario permanece na pagina (REQ-7)

---

## Decisões Técnicas

### DT-1: Persistência dos contadores de bloqueio — MySQL vs Redis
- **Problema:** Onde armazenar os contadores de tentativas falhas e os registros de bloqueio ativo para o mecanismo anti-força-bruta (REQ-8, REQ-9, REQ-12)
- **Alternativas consideradas:**
  - (a) MySQL (tabelas `login_attempts` e `login_blocks`) — consistente com o stack declarado no PRD; sem dependência nova
  - (b) Redis com TTL nativo — contadores efêmeros com expiração automática, menor latência de leitura/escrita
- **Decisão:** MySQL
- **Justificativa:** O PRD declara MySQL como única dependência de banco. Adicionar Redis exigiria nova infraestrutura nao prevista nos artefatos. O volume de tentativas de login nao justifica a complexidade adicional; o SLA de 2 segundos (NFR-1) é atendido com MySQL indexado. Trade-off: operacoes de leitura/escrita sao ligeiramente mais lentas que Redis, mas auditabilidade e rastreabilidade das tentativas (NFR-7) sao preservadas nativamente sem necessidade de retencao separada.
- **Requisito relacionado:** REQ-8, REQ-9, NFR-1, NFR-7

### DT-2: Integração do next-auth com arquitetura hexagonal
- **Problema:** O next-auth opera com um `authorize` callback dentro de `NextAuthOptions`, que pode facilmente tornar-se um adapter com logica de negocio — violando a constitution.md (regras 3 e 14)
- **Alternativas consideradas:**
  - (a) Implementar verificação de credenciais diretamente no `authorize` callback — simples, mas concentra logica de negocio no adapter de transporte
  - (b) `authorize` callback como adapter fino que delega integralmente ao `AuthenticateUserUseCase` via Port — mantem separacao de responsabilidades
- **Decisão:** Alternativa (b) — `authorize` callback como adapter fino
- **Justificativa:** A constitution.md proibe logica de negocio em adapters de transporte (regra 3). O `authorize` callback valida apenas o formato do payload (identifier nao vazio) e delega toda logica ao `AuthenticateUserUseCase`. Trade-off: indireto adicional sem impacto em performance; ganho em testabilidade do Domain de forma isolada.
- **Requisito relacionado:** REQ-2, REQ-3, constitution.md regras 3 e 14

### DT-3: Envio de email de aviso — síncrono vs assíncrono
- **Problema:** O NFR-8 exige envio de email em ate 5 minutos apos tentativa falha. O envio sincrono pode degradar a latência da resposta HTTP (NFR-1: 2 segundos para 95% dos casos)
- **Alternativas consideradas:**
  - (a) Síncrono — `EmailNotificationAdapter.sendWarning()` aguardado dentro do fluxo de autenticacao; simples, sem dependência de fila
  - (b) Assíncrono — fire-and-forget no adapter, sem aguardar a Promise de envio; desacopla latência de envio da resposta HTTP
- **Decisão:** Assíncrono (fire-and-forget no adapter, sem fila externa)
- **Justificativa:** O SLA de email é de 5 minutos (NFR-8), muito maior que o SLA de resposta HTTP de 2 segundos (NFR-1). Envio sincrono arriscaria violar NFR-1 em caso de lentidao do servidor SMTP. A abordagem fire-and-forget atende ambos os SLAs sem adicionar dependência de fila. Trade-off: falhas de envio nao sao refletidas na resposta HTTP — mitigado por log estruturado obrigatorio (constitution.md, regra 6).
- **Requisito relacionado:** REQ-14, NFR-1, NFR-8

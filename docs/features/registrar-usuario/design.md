# Design — Registrar Usuario

## 1. Visão Geral Técnica

O fluxo de registro de usuário é implementado em arquitetura hexagonal com três etapas principais: validação e criação do cadastro, envio de email com token de confirmação e ativação da conta via link. A senha é armazenada com hash argon2id (64 MB de memória, 3 iterações, paralelismo 2) e o token de confirmação é gerado com entropia mínima de 128 bits, invalidado imediatamente após o primeiro uso bem-sucedido. O adapter HTTP inbound valida todos os dados de entrada antes de encaminhar ao Domain, que contém exclusivamente a lógica de negócio de registro e confirmação; o envio de email é responsabilidade de um adapter de infraestrutura isolado. Rate limiting de 3 tentativas por IP em janela de 15 minutos é aplicado no adapter de transporte, retornando HTTP 429 quando o limite é excedido.

---

## 2. Arquitetura de Componentes

### RegisterUserUseCase
- **Camada:** application
- **Responsabilidade:** Orquestra o fluxo de registro: valida unicidade de email, cria o usuario com senha em hash, gera token de confirmacao e dispara o envio do email.
- **Depende de:** `UserRepository`, `PasswordHasher`, `TokenGenerator`, `EmailService`

### ConfirmAccountUseCase
- **Camada:** application
- **Responsabilidade:** Valida o token de confirmacao (existencia, uso unico, expiracao), ativa a conta do usuario e invalida o token imediatamente apos o uso bem-sucedido. Remove o cadastro pendente se o token estiver expirado.
- **Depende de:** `UserRepository`, `ConfirmationTokenRepository`

### User (entidade)
- **Camada:** domain
- **Responsabilidade:** Representa o usuario com seus campos e status (`pendente` / `ativo`); encapsula invariantes do dominio.
- **Depende de:** —

### ConfirmationToken (entidade)
- **Camada:** domain
- **Responsabilidade:** Representa o token de confirmacao com valor, data de expiracao, flag de uso unico e referencia ao usuario; encapsula as regras de verificacao de expiracao e reuso.
- **Depende de:** —

### UserRepository (port outbound)
- **Camada:** domain
- **Responsabilidade:** Interface de persistencia para criacao, busca por email, busca por id e remocao de usuarios.
- **Depende de:** —

### ConfirmationTokenRepository (port outbound)
- **Camada:** domain
- **Responsabilidade:** Interface de persistencia para criacao, busca por valor de token e invalidacao de tokens de confirmacao.
- **Depende de:** —

### PasswordHasher (port outbound)
- **Camada:** domain
- **Responsabilidade:** Interface para hashing de senhas; abstrai o algoritmo concreto (argon2id) do dominio.
- **Depende de:** —

### TokenGenerator (port outbound)
- **Camada:** domain
- **Responsabilidade:** Interface para geracao de tokens com entropia minima de 128 bits; permite substituicao em testes via injecao de dependencia (DT-2).
- **Depende de:** —

### EmailService (port outbound)
- **Camada:** domain
- **Responsabilidade:** Interface para envio de emails transacionais; abstrai o provedor de email concreto do dominio.
- **Depende de:** —

### RegisterUserHandler (adapter inbound)
- **Camada:** infrastructure (transport)
- **Responsabilidade:** Route Handler Next.js (`POST /api/auth/register`) que valida e sanitiza todos os campos de entrada e delega ao `RegisterUserUseCase`. Aplica o `RateLimiter` antes de processar.
- **Depende de:** `RegisterUserUseCase`, `RateLimiter`

### ConfirmAccountHandler (adapter inbound)
- **Camada:** infrastructure (transport)
- **Responsabilidade:** Route Handler Next.js (`GET /api/auth/confirm`) que extrai o token da query string e delega ao `ConfirmAccountUseCase`.
- **Depende de:** `ConfirmAccountUseCase`

### DrizzleUserRepository (adapter outbound) — *novo*
- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `UserRepository` usando Drizzle ORM sobre MySQL.
- **Depende de:** `UserRepository`, Drizzle

### DrizzleConfirmationTokenRepository (adapter outbound) — *novo*
- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `ConfirmationTokenRepository` usando Drizzle ORM sobre MySQL.
- **Depende de:** `ConfirmationTokenRepository`, Drizzle

### Argon2PasswordHasher (adapter outbound) — *novo*
- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `PasswordHasher` usando argon2id com 64 MB de memoria, 3 iteracoes e paralelismo 2 (NFR-2).
- **Depende de:** `PasswordHasher`

### CryptoTokenGenerator (adapter outbound) — *novo*
- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `TokenGenerator` usando `crypto.randomBytes` do Node.js, gerando tokens com entropia minima de 128 bits codificados em hex (NFR-3).
- **Depende de:** `TokenGenerator`

### MailhogEmailAdapter (adapter outbound) — *novo*
- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `EmailService` para ambiente de desenvolvimento, conectando ao Mailhog via SMTP.
- **Depende de:** `EmailService`

### RateLimiter (middleware) — *novo*
- **Camada:** infrastructure (transport)
- **Responsabilidade:** Contabiliza tentativas de cadastro por IP e bloqueia com HTTP 429 apos 3 tentativas em janela de 15 minutos (NFR-4).
- **Depende de:** —

---

## 3. Modelo de Dados

### User
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | UUID | Identificador unico do usuario |
| name | VARCHAR | Nome completo |
| email | VARCHAR | Endereco de email (unico) |
| password_hash | VARCHAR | Hash argon2id da senha (NFR-2) |
| birth_date | DATE | Data de nascimento |
| avatar_url | VARCHAR (nullable) | URL da foto de perfil (campo opcional — REQ-1) |
| status | ENUM('pending', 'active') | Status da conta (REQ-8, REQ-10) |
| created_at | TIMESTAMP | Data de criacao do registro |
| updated_at | TIMESTAMP | Data da ultima atualizacao |

**Relacoes:** 1:N com `ConfirmationToken` (um usuario pode ter no maximo um token ativo, mas o modelo suporta historico de tokens ja invalidados).

### ConfirmationToken
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | UUID | Identificador unico do token; usado em logs de observabilidade (NFR-7) |
| user_id | UUID | Referencia ao usuario associado |
| token | VARCHAR | Valor do token com entropia minima de 128 bits (NFR-3) |
| expires_at | TIMESTAMP | Data/hora de expiracao — criacao + 24 horas (REQ-9, REQ-12) |
| used_at | TIMESTAMP (nullable) | Data/hora do primeiro uso bem-sucedido; null indica nao utilizado (REQ-14, REQ-15, NFR-3) |
| created_at | TIMESTAMP | Data de criacao do token |

**Relacoes:** N:1 com `User` via chave estrangeira `user_id`.

---

## 4. API / Contratos

### POST /api/auth/register
- **Autenticacao:** publica
- **Request body:**
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "passwordConfirmation": "string",
    "birthDate": "string (YYYY-MM-DD)",
    "avatarUrl": "string (opcional)"
  }
  ```
- **Response 200:**
  ```json
  {
    "message": "Um link de confirmacao foi enviado ao seu email."
  }
  ```
- **Erros:**
  | Codigo | Condicao |
  |--------|----------|
  | 400 | Campo obrigatorio ausente (REQ-2) |
  | 400 | Email com formato invalido (REQ-6) |
  | 400 | Senha fora da politica de seguranca (REQ-4) |
  | 400 | Confirmacao de senha divergente (REQ-5) |
  | 409 | Email ja cadastrado (REQ-3) |
  | 429 | Limite de 3 tentativas por IP em 15 minutos excedido (NFR-4) |
  | 500 | Erro interno (falha ao persistir ou ao enviar email) |

  Todas as respostas de erro seguem a estrutura padronizada: `{ codigo, mensagem, requestId, timestamp }` (constitution.md, regra 5).

  **Nota sobre resposta neutra (NFR anti-enumeracao):** o endpoint retorna HTTP 200 com a mensagem padrao mesmo quando o email ja esta cadastrado? Nao — REQ-3 exige exibir mensagem especifica de email ja cadastrado, portanto este endpoint retorna 409 explicitamente. Anti-enumeracao nao se aplica ao fluxo de registro por decisao dos requisitos.

### GET /api/auth/confirm
- **Autenticacao:** publica
- **Query params:**
  | Parametro | Tipo | Descricao |
  |-----------|------|-----------|
  | token | string | Valor do token de confirmacao extraido do link enviado por email |
- **Response 200:**
  ```json
  {
    "message": "Sua conta foi ativada com sucesso.",
    "loginUrl": "/login"
  }
  ```
- **Erros:**
  | Codigo | Condicao |
  |--------|----------|
  | 400 | Token ausente ou malformado |
  | 410 | Token expirado — cadastro pendente removido automaticamente (REQ-12, REQ-13) |
  | 409 | Token ja utilizado — conta nao e alterada (REQ-14, REQ-15) |
  | 404 | Token nao encontrado |

  Todas as respostas de erro seguem a estrutura padronizada: `{ codigo, mensagem, requestId, timestamp }`.

---

## 5. Fluxo de Execução

### Fluxo: Cadastro realizado com dados validos

1. `RegisterUserHandler` recebe `POST /api/auth/register` e verifica o limite de tentativas via `RateLimiter`; se excedido, retorna HTTP 429.
2. `RegisterUserHandler` valida todos os campos de entrada: presenca dos obrigatorios, formato de email, politica de senha e coincidencia das senhas. Se qualquer validacao falhar, retorna HTTP 400 com a mensagem de erro correspondente e nenhum registro e criado (REQ-2, REQ-4, REQ-5, REQ-6, REQ-7).
3. `RegisterUserHandler` delega ao `RegisterUserUseCase` com os dados validados.
4. `RegisterUserUseCase` consulta `UserRepository.findByEmail` para verificar unicidade do email. Se o email ja existir, retorna erro HTTP 409 com a mensagem de email ja cadastrado (REQ-3). Nenhum registro e criado.
5. `RegisterUserUseCase` solicita a `PasswordHasher.hash` o hash argon2id da senha (64 MB, 3 iteracoes, paralelismo 2 — NFR-2).
6. `RegisterUserUseCase` cria a entidade `User` com status `pending` e persiste via `UserRepository.create` (REQ-8).
7. `RegisterUserUseCase` solicita a `TokenGenerator.generate` um token com entropia minima de 128 bits. `CryptoTokenGenerator` usa `crypto.randomBytes(16)` e retorna o valor em hex (NFR-3).
8. `RegisterUserUseCase` cria a entidade `ConfirmationToken` com `expires_at = agora + 24 horas` e persiste via `ConfirmationTokenRepository.create` (REQ-9).
9. `RegisterUserUseCase` solicita a `EmailService.send` o envio do email com o link de confirmacao contendo o token. Falhas de envio sao registradas em log estruturado JSON com os campos: timestamp, requestId, email parcialmente mascarado, tipoEvento e motivoFalha (NFR-6).
10. `RegisterUserUseCase` registra em log estruturado JSON a tentativa de criacao de cadastro com os campos: timestamp, requestId, email parcialmente mascarado, tipoEvento (NFR-6).
11. `RegisterUserHandler` retorna HTTP 200 com a mensagem informando que o link foi enviado ao email.

**Fluxos alternativos:**
- Se `RateLimiter` detectar 3 ou mais tentativas do mesmo IP nos ultimos 15 minutos: retorna HTTP 429 imediatamente, sem processar a requisicao (NFR-4).
- Se qualquer campo obrigatorio estiver ausente: `RegisterUserHandler` retorna HTTP 400 com a mensagem do campo especifico (REQ-2). Nenhum registro e criado.
- Se o email ja estiver cadastrado: `RegisterUserUseCase` retorna erro e `RegisterUserHandler` responde HTTP 409 (REQ-3). Nenhum registro e criado.
- Se o envio de email falhar: a falha e logada em JSON (NFR-6); a conta permanece com status `pending` e o token permanece valido para nova tentativa de envio (comportamento de resiliencia — fora do escopo do reenvio manual).

---

### Fluxo: Confirmacao de conta via link valido

1. `ConfirmAccountHandler` recebe `GET /api/auth/confirm?token=<valor>`.
2. `ConfirmAccountHandler` extrai o valor do token da query string. Se ausente ou malformado, retorna HTTP 400.
3. `ConfirmAccountHandler` delega ao `ConfirmAccountUseCase` com o valor do token.
4. `ConfirmAccountUseCase` consulta `ConfirmationTokenRepository.findByToken`. Se nao encontrado, retorna HTTP 404.
5. `ConfirmAccountUseCase` verifica se `used_at` e nao nulo. Se ja utilizado, registra log JSON com timestamp, resultado, tokenId e requestId (NFR-7) e retorna erro HTTP 409 com a mensagem de link ja utilizado. A conta nao e alterada (REQ-14, REQ-15).
6. `ConfirmAccountUseCase` verifica se `expires_at < agora`. Se expirado: remove o cadastro pendente via `UserRepository.delete` (REQ-12), registra log JSON (NFR-7) e retorna erro HTTP 410 com a mensagem de link expirado e instrucao para recadastro (REQ-13).
7. `ConfirmAccountUseCase` atualiza `ConfirmationToken.used_at = agora` via `ConfirmationTokenRepository.markAsUsed` — invalidacao imediata apos o primeiro uso (NFR-3, REQ-14).
8. `ConfirmAccountUseCase` atualiza o status do usuario para `active` via `UserRepository.activate` (REQ-10).
9. `ConfirmAccountUseCase` registra log JSON com timestamp, resultado=`sucesso`, tokenId e requestId (NFR-7).
10. `ConfirmAccountHandler` retorna HTTP 200 com a mensagem de conta ativada e o link de acesso ao sistema (REQ-11).

**Fluxos alternativos:**
- Se o token nao existir no banco: retorna HTTP 404.
- Se o token ja tiver sido utilizado (`used_at` nao nulo): retorna HTTP 409 sem alterar nenhum dado (REQ-14, REQ-15).
- Se o token estiver expirado (`expires_at < agora`): remove o cadastro pendente, loga o evento e retorna HTTP 410 (REQ-12, REQ-13).

---

### Fluxo: Cadastro com dados invalidos no formulario

Coberto pelos fluxos alternativos do "Fluxo: Cadastro realizado com dados validos" acima. Cada situacao do `Scenario Outline` corresponde a uma validacao especifica no `RegisterUserHandler` (passos 2 e 4) com retorno HTTP 400 ou 409 e mensagem de erro especifica. Nenhum cadastro e criado em nenhum dos casos (REQ-7).

---

## 6. Decisões Técnicas

### DT-1: Algoritmo de hash de senha — argon2id vs. bcrypt
- **Problema:** Qual algoritmo usar para hash de senhas, equilibrando segurança e custo de processamento dentro do SLA de 3 segundos (NFR-1)?
- **Alternativas consideradas:** bcrypt (custo 12), argon2id (64 MB, 3 iteracoes, paralelismo 2)
- **Decisao:** argon2id com 64 MB de memoria, 3 iteracoes e paralelismo 2
- **Justificativa:** Argon2id e resistente a ataques de GPU e side-channel, sendo o vencedor da Password Hashing Competition. O trade-off e maior uso de memoria (64 MB por operacao) em relacao ao bcrypt, mas oferece protecao superior contra ataques de forca bruta com hardware especializado. Os parametros escolhidos ficam dentro do budget de latencia de 3 segundos (NFR-1).
- **Requisito relacionado:** NFR-2, REQ-4

### DT-2: Geracao de token de confirmacao — Port `TokenGenerator` vs. chamada direta
- **Problema:** Como gerar tokens de confirmacao com alta entropia de forma testavel, sem acoplar o Domain a uma implementacao concreta de `crypto`?
- **Alternativas consideradas:** Chamada direta a `crypto.randomBytes` no caso de uso; Port `TokenGenerator` com implementacao concreta via injecao de dependencia
- **Decisao:** Port separado `TokenGenerator` no Domain com `CryptoTokenGenerator` como adapter de infraestrutura
- **Justificativa:** Permite substituir a implementacao em testes unitarios via injecao de dependencia, sem mockar modulos do Node.js. O trade-off e uma interface adicional no Domain, mas isso e consistente com a arquitetura hexagonal e com o principio de inversao de dependencia (DIP — constitution.md, regra 8). A implementacao `CryptoTokenGenerator` usa `crypto.randomBytes(16)` codificado em hex, garantindo 128 bits de entropia (NFR-3).
- **Requisito relacionado:** NFR-3, REQ-9

### DT-3: Estrategia de rate limiting — armazenamento em memoria vs. banco de dados
- **Problema:** Onde armazenar os contadores de tentativas por IP para o rate limiting (NFR-4)? A ausencia de Redis no stack atual levanta a questao sobre onde persistir o estado.
- **Alternativas consideradas:** Armazenamento em memoria no processo Next.js (Map/LRU cache); persistencia em tabela MySQL via Drizzle
- **Decisao:** Armazenamento em memoria no processo Next.js com Map e TTL manual
- **Justificativa:** O stack do projeto (CLAUDE.md) nao inclui Redis. Adicionar Redis apenas para rate limiting seria overengineering para o escopo atual. O armazenamento em memoria e suficiente para um unico processo Next.js e nao requer nova dependencia de infraestrutura. O trade-off e que os contadores sao resetados ao reiniciar o processo e nao sao compartilhados entre replicas horizontais — risco aceitavel para o escopo deste curso. A alternativa MySQL adicionaria latencia a cada requisicao de cadastro, comprometendo NFR-1.
- **Requisito relacionado:** NFR-4

### DT-4: Mecanismo de confirmacao — token em query string vs. link magico assinado (JWT)
- **Problema:** Como estruturar o link de confirmacao enviado por email: token opaco em query string ou JWT autocontido?
- **Alternativas consideradas:** Token opaco armazenado no banco (UUID/hex), acessado via query string; JWT assinado com expiracao embutida (sem necessidade de banco para validacao)
- **Decisao:** Token opaco com 128 bits de entropia armazenado na tabela `confirmation_tokens`, enviado como query param
- **Justificativa:** O token opaco permite invalidacao imediata apos o uso (basta setar `used_at`), o que e exigido por NFR-3 e REQ-14. JWTs sao stateless e nao podem ser invalidados sem uma blocklist, o que adicionaria complexidade equivalente a manter o banco de tokens — sem o beneficio da invalidacao imediata. O trade-off do token opaco e a necessidade de consultar o banco em cada confirmacao, mas isso ja e necessario para verificar expiracao e ativar a conta.
- **Requisito relacionado:** NFR-3, REQ-14, REQ-15

### DT-5: Remocao do cadastro pendente apos expiracao — sincrona vs. job assincrono
- **Problema:** Quando remover o cadastro pendente associado a um token expirado: no momento em que o usuario acessa o link expirado, ou via job periodico de limpeza?
- **Alternativas consideradas:** Remocao sincrona no fluxo de confirmacao (quando o link e acessado); job assincrono periodico (cron) de limpeza de registros pendentes expirados
- **Decisao:** Remocao sincrona no `ConfirmAccountUseCase` quando o token expirado e acessado
- **Justificativa:** REQ-12 exige que o cadastro pendente seja removido automaticamente quando o link expirado e acessado. A remocao sincrona atende ao requisito sem adicionar complexidade de agendamento de jobs. O trade-off e que cadastros pendentes cujo link nunca foi acessado permanecrao no banco indefinidamente — mas o PRD delimita que reenvio e recadastro estao fora do escopo, e o volume de registros orphaos pode ser monitorado conforme o PRD sugere.
- **Requisito relacionado:** REQ-12, REQ-13

---

## 7. Checklist de Implementação

### Fase 1: Modelo

- [ ] Criar entidade `User` com campos: id, name, email, password_hash, birth_date, avatar_url (nullable), status (pending/active), created_at, updated_at (REQ-8)
- [ ] Criar entidade `ConfirmationToken` com campos: id, user_id, token, expires_at, used_at (nullable), created_at (REQ-9, NFR-3)
- [ ] Criar migration para a tabela `users` com constraint UNIQUE em email
- [ ] Criar migration para a tabela `confirmation_tokens` com chave estrangeira para `users`

### Fase 2: Domínio

- [ ] Implementar port `UserRepository` com metodos: `create`, `findByEmail`, `findById`, `delete`, `activate`
- [ ] Implementar port `ConfirmationTokenRepository` com metodos: `create`, `findByToken`, `markAsUsed`
- [ ] Implementar port `PasswordHasher` com metodo: `hash`
- [ ] Implementar port `TokenGenerator` com metodo: `generate` (retorna string com 128 bits de entropia — NFR-3, DT-2)
- [ ] Implementar port `EmailService` com metodo: `send`
- [ ] Implementar `RegisterUserUseCase` com orquestracao: verificar unicidade de email, hash de senha, criacao do usuario, geracao e persistencia do token, envio de email e log estruturado (REQ-8, REQ-9, NFR-6)
- [ ] Implementar `ConfirmAccountUseCase` com verificacao de: token nao encontrado, token ja utilizado, token expirado e ativacao da conta com invalidacao imediata do token (REQ-10, REQ-12, REQ-14, REQ-15, NFR-3, NFR-7)
- [ ] Garantir que nenhuma regra de negocio reside fora da camada Domain (constitution.md, regras 1 e 14)

### Fase 3: Infraestrutura

- [ ] Implementar `DrizzleUserRepository` com todos os metodos do port `UserRepository` usando Drizzle sobre MySQL
- [ ] Implementar `DrizzleConfirmationTokenRepository` com todos os metodos do port `ConfirmationTokenRepository` usando Drizzle
- [ ] Garantir que Drizzle nao e importado em nenhuma entidade Domain ou caso de uso (constitution.md, regras 2 e 13)
- [ ] Implementar `Argon2PasswordHasher` com argon2id configurado: 64 MB de memoria, 3 iteracoes, paralelismo 2 (NFR-2)
- [ ] Implementar `CryptoTokenGenerator` usando `crypto.randomBytes(16)` codificado em hex, garantindo 128 bits de entropia (NFR-3, DT-2)
- [ ] Implementar `MailhogEmailAdapter` com template do link de confirmacao e conexao SMTP ao Mailhog (ambiente de desenvolvimento)
- [ ] Implementar `RateLimiter` com contadores por IP em memoria, janela de 15 minutos e limite de 3 tentativas, retornando HTTP 429 ao exceder (NFR-4, DT-3)
- [ ] Implementar log estruturado JSON para: tentativas de criacao de cadastro, falhas de envio de email e eventos de confirmacao — usando os campos exigidos por NFR-6 e NFR-7 (constitution.md, regra 6)

### Fase 4: API

- [ ] Implementar `RegisterUserHandler` em `app/api/auth/register/route.ts` com validacao de todos os campos obrigatorios antes de delegar ao Domain (REQ-1, REQ-2, REQ-4, REQ-5, REQ-6, constitution.md, regra 4)
- [ ] Garantir que `RegisterUserHandler` retorna HTTP 400 para campos invalidos ou ausentes, 409 para email duplicado e 429 para rate limit excedido (REQ-2, REQ-3, REQ-6, NFR-4)
- [ ] Implementar `ConfirmAccountHandler` em `app/api/auth/confirm/route.ts` com extracao do token da query string e delegacao ao Domain
- [ ] Garantir que `ConfirmAccountHandler` retorna HTTP 410 para token expirado, 409 para token ja utilizado e 404 para token nao encontrado (REQ-12, REQ-13, REQ-14)
- [ ] Garantir que todas as respostas de erro seguem a estrutura padronizada: `{ codigo, mensagem, requestId, timestamp }` (constitution.md, regra 5)

### Fase 5: Testes

- [ ] Cobrir cenario BDD: "Cadastro realizado com dados validos" — teste de integracao para `POST /api/auth/register` com dados validos verificando resposta HTTP 200 e criacao do token no banco
- [ ] Cobrir cenario BDD: "Cadastro com dados invalidos no formulario" — testes parametrizados para cada situacao do `Scenario Outline` (email duplicado, senha invalida, senhas divergentes, nome em branco, data em branco, email invalido)
- [ ] Cobrir cenario BDD: "Confirmacao de conta via link valido" — teste de integracao para `GET /api/auth/confirm?token=<valido>` verificando status da conta alterado para `active` e token marcado como usado
- [ ] Cobrir cenario BDD: "Confirmacao de cadastro com link expirado" — teste verificando que o cadastro pendente e removido e HTTP 410 e retornado (REQ-12)
- [ ] Cobrir cenario BDD: "Confirmacao de cadastro com link ja utilizado" — teste verificando que o status da conta nao e alterado e HTTP 409 e retornado (REQ-14, REQ-15)
- [ ] Teste unitario para `RegisterUserUseCase`: verificar que nenhum registro e criado quando o email ja existe (REQ-3, REQ-7)
- [ ] Teste unitario para `ConfirmAccountUseCase`: verificar invalidacao imediata do token apos uso bem-sucedido (NFR-3)
- [ ] Teste unitario para `CryptoTokenGenerator`: verificar que tokens gerados tem comprimento compativel com 128 bits de entropia e sao distintos entre chamadas consecutivas (NFR-3)
- [ ] Teste unitario para `Argon2PasswordHasher`: verificar que o hash gerado nao e igual a senha em texto simples (NFR-2)
- [ ] Teste de integracao para `RateLimiter`: verificar que a 4a tentativa do mesmo IP retorna HTTP 429 (NFR-4)
- [ ] Verificar que logs estruturados JSON sao emitidos nos eventos de criacao de cadastro, falha de email e confirmacao (NFR-6, NFR-7)

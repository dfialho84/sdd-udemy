# Design — Registrar Usuario

## 1. Visão Geral Técnica

O fluxo de registro de usuário é implementado em arquitetura hexagonal com quatro etapas: navegação da home para o formulário de cadastro, validação e criação do cadastro, envio de email com token de confirmação e ativação da conta via link. A senha é armazenada com hash argon2id (64 MB de memória, 3 iterações, paralelismo 2) e o token de confirmação é gerado com entropia mínima de 128 bits, invalidado imediatamente após o primeiro uso bem-sucedido. O adapter HTTP inbound recebe os dados via `multipart/form-data`, valida todos os campos e, se um arquivo de avatar for fornecido, delega o armazenamento ao `LocalAvatarStorageAdapter` antes de encaminhar ao Domain; o `RegisterUserUseCase` continua recebendo `avatarUrl: string | null` — sem alteração no Domain. O armazenamento do avatar é feito em filesystem local (`public/uploads/avatars/<uuid>.<ext>`), servido diretamente pelo Next.js via diretório `public/`. O envio de email é responsabilidade de um adapter de infraestrutura isolado, com SLA de entrega de até 60 segundos (NFR-3). Rate limiting de 3 tentativas por IP em janela de 15 minutos é aplicado no adapter de transporte, retornando HTTP 429 quando o limite é excedido (NFR-6). As páginas `/` e `/register` devem estar em conformidade com WCAG 2.1 nível AA (NFR-9).

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

### AvatarStoragePort (port outbound) — _novo_

- **Camada:** domain/ports
- **Responsabilidade:** Interface de armazenamento de avatar; abstrai o meio de persistência (filesystem, cloud) do adapter HTTP.
- **Métodos:** `save(buffer: Buffer, mimeType: string): Promise<string>`
- **Depende de:** —

### LocalAvatarStorageAdapter (adapter outbound) — _novo_

- **Camada:** infrastructure
- **Responsabilidade:** Implementação concreta de `AvatarStoragePort`; salva o arquivo em `public/uploads/avatars/<uuid>.<ext>` e retorna o caminho relativo.
- **Depende de:** `AvatarStoragePort`, módulo `fs` do Node.js

### HomePage (adapter de apresentação) — _novo_

- **Camada:** infrastructure (transport / UI)
- **Responsabilidade:** Página React Server Component em `src/app/page.tsx` que exibe a página inicial com um link de navegação para `/register`. Não contém lógica de negócio. O link deve ser acessível via teclado e compatível com leitores de tela (NFR-9). O redirecionamento para `/register` deve ocorrer em até 1 segundo após o clique (NFR-1, REQ-1).
- **Depende de:** —

### RegisterPage (adapter de apresentação) — _novo_

- **Camada:** infrastructure (transport / UI)
- **Responsabilidade:** Página React em `src/app/register/page.tsx` que exibe o formulário de cadastro com os campos nome, email, senha, confirmação de senha, data de nascimento e foto de perfil (REQ-2). Gerencia o estado do formulário com react-hook-form e validação Zod no lado do cliente. Submete os dados ao `POST /api/auth/register` e, ao receber sucesso, exibe a tela de confirmação de envio de email (REQ-5). Deve estar em conformidade com WCAG 2.1 nível AA (NFR-9).
- **Depende de:** —

### RegisterUserHandler (adapter inbound)

- **Camada:** infrastructure (transport)
- **Responsabilidade:** Route Handler Next.js (`POST /api/auth/register`) que lê `multipart/form-data`, valida e sanitiza todos os campos de entrada — incluindo tipo MIME (image/jpeg|png|webp) e tamanho (≤ 2 MB) do arquivo de avatar, se fornecido —, invoca `LocalAvatarStorageAdapter.save()` para obter o caminho relativo e delega ao `RegisterUserUseCase`. Aplica o `RateLimiter` antes de processar.
- **Depende de:** `RegisterUserUseCase`, `RateLimiter`, `AvatarStoragePort`

### ConfirmAccountHandler (adapter inbound)

- **Camada:** infrastructure (transport)
- **Responsabilidade:** Route Handler Next.js (`GET /api/auth/confirm`) que extrai o token da query string, delega ao `ConfirmAccountUseCase` e retorna HTTP 302 Redirect para `/confirm?status=success` no caminho feliz ou `/confirm?error=<tipo>` nos casos de erro.
- **Depende de:** `ConfirmAccountUseCase`

### ConfirmPage (adapter de apresentação) — _novo_

- **Camada:** infrastructure (transport / UI)
- **Responsabilidade:** Página React Server Component em `src/app/confirm/page.tsx` que lê os `searchParams` (`status` e `error`) e renderiza HTML de sucesso ou erro no navegador. Não contém lógica de negócio — apenas apresentação do resultado da confirmação.
- **Depende de:** —

### DrizzleUserRepository (adapter outbound) — _novo_

- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `UserRepository` usando Drizzle ORM sobre MySQL.
- **Depende de:** `UserRepository`, Drizzle

### DrizzleConfirmationTokenRepository (adapter outbound) — _novo_

- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `ConfirmationTokenRepository` usando Drizzle ORM sobre MySQL.
- **Depende de:** `ConfirmationTokenRepository`, Drizzle

### Argon2PasswordHasher (adapter outbound) — _novo_

- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `PasswordHasher` usando argon2id com 64 MB de memoria, 3 iteracoes e paralelismo 2 (NFR-4).
- **Depende de:** `PasswordHasher`

### CryptoTokenGenerator (adapter outbound) — _novo_

- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `TokenGenerator` usando `crypto.randomBytes` do Node.js, gerando tokens com entropia minima de 128 bits codificados em hex (NFR-5).
- **Depende de:** `TokenGenerator`

### MailhogEmailAdapter (adapter outbound) — _novo_

- **Camada:** infrastructure
- **Responsabilidade:** Implementacao concreta de `EmailService` para ambiente de desenvolvimento, conectando ao Mailhog via SMTP.
- **Depende de:** `EmailService`

### RateLimiter (middleware) — _novo_

- **Camada:** infrastructure (transport)
- **Responsabilidade:** Contabiliza tentativas de cadastro por IP e bloqueia com HTTP 429 apos 3 tentativas em janela de 15 minutos (NFR-6).
- **Depende de:** —

---

## 3. Modelo de Dados

### User

| Campo         | Tipo                      | Descricao                                                                                                                |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| id            | UUID                      | Identificador unico do usuario                                                                                           |
| name          | VARCHAR                   | Nome completo                                                                                                            |
| email         | VARCHAR                   | Endereco de email (unico)                                                                                                |
| password_hash | VARCHAR                   | Hash argon2id da senha (NFR-4)                                                                                           |
| birth_date    | DATE                      | Data de nascimento                                                                                                       |
| avatar_url    | VARCHAR (nullable)        | Caminho relativo ao servidor do arquivo de avatar salvo (`/uploads/avatars/<uuid>.<ext>`); null se não fornecido (REQ-2) |
| status        | ENUM('pending', 'active') | Status da conta (REQ-3, REQ-12)                                                                                          |
| created_at    | TIMESTAMP                 | Data de criacao do registro                                                                                              |
| updated_at    | TIMESTAMP                 | Data da ultima atualizacao                                                                                               |

**Relacoes:** 1:N com `ConfirmationToken` (um usuario pode ter no maximo um token ativo, mas o modelo suporta historico de tokens ja invalidados).

### ConfirmationToken

| Campo      | Tipo                 | Descricao                                                                                 |
| ---------- | -------------------- | ----------------------------------------------------------------------------------------- |
| id         | UUID                 | Identificador unico do token; usado em logs de observabilidade (NFR-11)                   |
| user_id    | UUID                 | Referencia ao usuario associado                                                           |
| token      | VARCHAR              | Valor do token com entropia minima de 128 bits (NFR-5)                                    |
| expires_at | TIMESTAMP            | Data/hora de expiracao — criacao + 24 horas (REQ-4, REQ-15)                               |
| used_at    | TIMESTAMP (nullable) | Data/hora do primeiro uso bem-sucedido; null indica nao utilizado (REQ-14, REQ-18, NFR-5) |
| created_at | TIMESTAMP            | Data de criacao do token                                                                  |

**Relacoes:** N:1 com `User` via chave estrangeira `user_id`.

---

## 4. API / Contratos

### POST /api/auth/register

- **Autenticacao:** publica
- **Content-Type:** `multipart/form-data`
- **Request body:**
  | Campo | Tipo | Descricao |
  |-------|------|-----------|
  | name | text | obrigatorio |
  | email | text | obrigatorio |
  | password | text | obrigatorio |
  | passwordConfirmation | text | obrigatorio |
  | birthDate | text | obrigatorio (YYYY-MM-DD) |
  | avatar | file | opcional (image/jpeg \| image/png \| image/webp, máx 2 MB) |
- **Response 200:**
    ```json
    {
        "message": "Um link de confirmacao foi enviado ao seu email."
    }
    ```
- **Erros:**
  | Codigo | Condicao |
  |--------|----------|
  | 400 | Campo obrigatorio ausente (REQ-6) |
  | 400 | Email com formato invalido (REQ-10) |
  | 400 | Senha fora da politica de seguranca (REQ-8) |
  | 400 | Confirmacao de senha divergente (REQ-9) |
  | 400 | Tipo de arquivo nao permitido (nao e image/jpeg, image/png ou image/webp) |
  | 400 | Arquivo excede 2 MB |
  | 409 | Email ja cadastrado (REQ-7) |
  | 429 | Limite de 3 tentativas por IP em 15 minutos excedido (NFR-6) |
  | 500 | Erro interno (falha ao persistir, ao armazenar avatar ou ao enviar email) |

    Todas as respostas de erro seguem a estrutura padronizada: `{ codigo, mensagem, requestId, timestamp }` (constitution.md, regra 5).

    **Nota sobre resposta neutra (NFR anti-enumeracao):** o endpoint retorna HTTP 200 com a mensagem padrao mesmo quando o email ja esta cadastrado? Nao — REQ-7 exige exibir mensagem especifica de email ja cadastrado, portanto este endpoint retorna 409 explicitamente. Anti-enumeracao nao se aplica ao fluxo de registro por decisao dos requisitos.

### GET /api/auth/confirm

- **Autenticacao:** publica
- **Query params:**
  | Parametro | Tipo | Descricao |
  |-----------|------|-----------|
  | token | string | Valor do token de confirmacao extraido do link enviado por email |
- **Response (caminho feliz):** `302 Redirect → /confirm?status=success`
- **Respostas de erro (todos como redirect):**
  | Codigo | Destino do Redirect | Condicao |
  |--------|---------------------|----------|
  | 302 | `/confirm?error=invalid_token` | Token ausente ou malformado |
  | 302 | `/confirm?error=expired` | Token expirado — cadastro pendente removido automaticamente (REQ-15, REQ-16) |
  | 302 | `/confirm?error=already_confirmed` | Token ja utilizado — conta nao e alterada (REQ-17, REQ-18) |
  | 302 | `/confirm?error=not_found` | Token nao encontrado |

    Todos os erros resultam em redirect 302 para `/confirm` com o parâmetro `error` indicando o tipo de falha. A página `/confirm` é responsável por renderizar a mensagem adequada ao visitante.

---

## 5. Fluxo de Execução

### Fluxo: Acessar formulario de cadastro via link na home

1. `HomePage` renderiza a pagina inicial (`/`) com um link de navegacao acessivel para `/register` (REQ-1, NFR-9).
2. O visitante clica no link de registro.
3. O navegador navega para `/register`. `RegisterPage` e renderizado pelo Next.js em ate 1 segundo apos o clique (NFR-1).
4. `RegisterPage` exibe o formulario com os campos: nome, email, senha, confirmacao de senha, data de nascimento e foto de perfil (REQ-2).

**Fluxos alternativos:**

- Nao ha fluxos alternativos para este cenario — e uma navegacao simples sem logica condicional.

---

### Fluxo: Cadastro realizado com dados validos

1. `RegisterUserHandler` recebe `POST /api/auth/register` e verifica o limite de tentativas via `RateLimiter`; se excedido, retorna HTTP 429.
2. `RegisterUserHandler` extrai campos e arquivo do `FormData`. Valida campos obrigatórios, formato de email, política de senha e coincidência das senhas. Se qualquer validação falhar, retorna HTTP 400 com a mensagem de erro correspondente e nenhum registro é criado (REQ-6, REQ-8, REQ-9, REQ-10, REQ-11).
   2b. Se arquivo de avatar fornecido: `RegisterUserHandler` valida tipo MIME (image/jpeg, image/png ou image/webp) e tamanho (≤ 2 MB). Se inválido, retorna HTTP 400. Caso contrário, invoca `LocalAvatarStorageAdapter.save()`, obtém caminho relativo e o usa como `avatarUrl`. Se falha no armazenamento, retorna HTTP 500.
3. `RegisterUserHandler` delega ao `RegisterUserUseCase` com os dados validados, incluindo `avatarUrl` (caminho relativo ou `null`).
4. `RegisterUserUseCase` consulta `UserRepository.findByEmail` para verificar unicidade do email. Se o email ja existir, retorna erro HTTP 409 com a mensagem de email ja cadastrado (REQ-7). Nenhum registro e criado.
5. `RegisterUserUseCase` solicita a `PasswordHasher.hash` o hash argon2id da senha (64 MB, 3 iteracoes, paralelismo 2 — NFR-4).
6. `RegisterUserUseCase` cria a entidade `User` com status `pending` e persiste via `UserRepository.create` (REQ-3).
7. `RegisterUserUseCase` solicita a `TokenGenerator.generate` um token com entropia minima de 128 bits. `CryptoTokenGenerator` usa `crypto.randomBytes(16)` e retorna o valor em hex (NFR-5).
8. `RegisterUserUseCase` cria a entidade `ConfirmationToken` com `expires_at = agora + 24 horas` e persiste via `ConfirmationTokenRepository.create` (REQ-4).
9. `RegisterUserUseCase` solicita a `EmailService.send` o envio do email com o link de confirmacao contendo o token. O email deve ser entregue em ate 60 segundos (NFR-3). Falhas de envio sao registradas em log estruturado JSON com os campos: timestamp, requestId, email parcialmente mascarado, tipoEvento e motivoFalha (NFR-10).
10. `RegisterUserUseCase` registra em log estruturado JSON a tentativa de criacao de cadastro com os campos: timestamp, requestId, email parcialmente mascarado, tipoEvento (NFR-10).
11. `RegisterUserHandler` retorna HTTP 200 com a mensagem informando que o link foi enviado ao email. `RegisterPage` exibe a tela de confirmacao de envio (REQ-5).

**Fluxos alternativos:**

- Se `RateLimiter` detectar 3 ou mais tentativas do mesmo IP nos ultimos 15 minutos: retorna HTTP 429 imediatamente, sem processar a requisicao (NFR-6).
- Se qualquer campo obrigatorio estiver ausente: `RegisterUserHandler` retorna HTTP 400 com a mensagem do campo especifico (REQ-6). Nenhum registro e criado.
- Se o email ja estiver cadastrado: `RegisterUserUseCase` retorna erro e `RegisterUserHandler` responde HTTP 409 (REQ-7). Nenhum registro e criado.
- Se o envio de email falhar: a falha e logada em JSON (NFR-10); a conta permanece com status `pending` e o token permanece valido para nova tentativa de envio (comportamento de resiliencia — fora do escopo do reenvio manual).

---

### Fluxo: Confirmacao de conta via link valido

1. `ConfirmAccountHandler` recebe `GET /api/auth/confirm?token=<valor>`.
2. `ConfirmAccountHandler` extrai o valor do token da query string. Se ausente ou malformado, retorna HTTP 400.
3. `ConfirmAccountHandler` delega ao `ConfirmAccountUseCase` com o valor do token.
4. `ConfirmAccountUseCase` consulta `ConfirmationTokenRepository.findByToken`. Se nao encontrado, retorna HTTP 404.
5. `ConfirmAccountUseCase` verifica se `used_at` e nao nulo. Se ja utilizado, registra log JSON com timestamp, resultado, tokenId e requestId (NFR-11) e retorna sinal para redirect `/confirm?error=already_confirmed`. A conta nao e alterada (REQ-17, REQ-18).
6. `ConfirmAccountUseCase` verifica se `expires_at < agora`. Se expirado: remove o cadastro pendente via `UserRepository.delete` (REQ-15), registra log JSON (NFR-11) e retorna sinal para redirect `/confirm?error=expired` com instrucao para recadastro em `/register` (REQ-16).
7. `ConfirmAccountUseCase` atualiza `ConfirmationToken.used_at = agora` via `ConfirmationTokenRepository.markAsUsed` — invalidacao imediata apos o primeiro uso (NFR-5, REQ-14).
8. `ConfirmAccountUseCase` atualiza o status do usuario para `active` via `UserRepository.activate` (REQ-12).
9. `ConfirmAccountUseCase` registra log JSON com timestamp, resultado=`sucesso`, tokenId e requestId (NFR-11).
10. `ConfirmAccountHandler` retorna HTTP 302 Redirect para `/confirm?status=success` (REQ-13). A página `/confirm` renderiza a mensagem de sucesso e o link para acessar o sistema.

**Fluxos alternativos:**

- Se o token nao existir no banco: retorna HTTP 302 Redirect para `/confirm?error=not_found`.
- Se o token ja tiver sido utilizado (`used_at` nao nulo): retorna HTTP 302 Redirect para `/confirm?error=already_confirmed` sem alterar nenhum dado (REQ-17, REQ-18).
- Se o token estiver expirado (`expires_at < agora`): remove o cadastro pendente, loga o evento e retorna HTTP 302 Redirect para `/confirm?error=expired` (REQ-15, REQ-16).

---

### Fluxo: Cadastro com dados invalidos no formulario

Coberto pelos fluxos alternativos do "Fluxo: Cadastro realizado com dados validos" acima. Cada situacao do `Scenario Outline` corresponde a uma validacao especifica no `RegisterUserHandler` (passos 2 e 4) com retorno HTTP 400 ou 409 e mensagem de erro especifica. Nenhum cadastro e criado em nenhum dos casos (REQ-11).

---

## 6. Decisões Técnicas

### DT-1: Algoritmo de hash de senha — argon2id vs. bcrypt

- **Problema:** Qual algoritmo usar para hash de senhas, equilibrando segurança e custo de processamento dentro do SLA de 3 segundos (NFR-2)?
- **Alternativas consideradas:** bcrypt (custo 12), argon2id (64 MB, 3 iteracoes, paralelismo 2)
- **Decisao:** argon2id com 64 MB de memoria, 3 iteracoes e paralelismo 2
- **Justificativa:** Argon2id e resistente a ataques de GPU e side-channel, sendo o vencedor da Password Hashing Competition. O trade-off e maior uso de memoria (64 MB por operacao) em relacao ao bcrypt, mas oferece protecao superior contra ataques de forca bruta com hardware especializado. Os parametros escolhidos ficam dentro do budget de latencia de 3 segundos (NFR-2).
- **Requisito relacionado:** NFR-4, REQ-8

### DT-2: Geracao de token de confirmacao — Port `TokenGenerator` vs. chamada direta

- **Problema:** Como gerar tokens de confirmacao com alta entropia de forma testavel, sem acoplar o Domain a uma implementacao concreta de `crypto`?
- **Alternativas consideradas:** Chamada direta a `crypto.randomBytes` no caso de uso; Port `TokenGenerator` com implementacao concreta via injecao de dependencia
- **Decisao:** Port separado `TokenGenerator` no Domain com `CryptoTokenGenerator` como adapter de infraestrutura
- **Justificativa:** Permite substituir a implementacao em testes unitarios via injecao de dependencia, sem mockar modulos do Node.js. O trade-off e uma interface adicional no Domain, mas isso e consistente com a arquitetura hexagonal e com o principio de inversao de dependencia (DIP — constitution.md, regra 8). A implementacao `CryptoTokenGenerator` usa `crypto.randomBytes(16)` codificado em hex, garantindo 128 bits de entropia (NFR-5).
- **Requisito relacionado:** NFR-5, REQ-4

### DT-3: Estrategia de rate limiting — armazenamento em memoria vs. banco de dados

- **Problema:** Onde armazenar os contadores de tentativas por IP para o rate limiting (NFR-6)? A ausencia de Redis no stack atual levanta a questao sobre onde persistir o estado.
- **Alternativas consideradas:** Armazenamento em memoria no processo Next.js (Map/LRU cache); persistencia em tabela MySQL via Drizzle
- **Decisao:** Armazenamento em memoria no processo Next.js com Map e TTL manual
- **Justificativa:** O stack do projeto (CLAUDE.md) nao inclui Redis. Adicionar Redis apenas para rate limiting seria overengineering para o escopo atual. O armazenamento em memoria e suficiente para um unico processo Next.js e nao requer nova dependencia de infraestrutura. O trade-off e que os contadores sao resetados ao reiniciar o processo e nao sao compartilhados entre replicas horizontais — risco aceitavel para o escopo deste curso. A alternativa MySQL adicionaria latencia a cada requisicao de cadastro, comprometendo NFR-2.
- **Requisito relacionado:** NFR-6

### DT-4: Mecanismo de confirmacao — token em query string vs. link magico assinado (JWT)

- **Problema:** Como estruturar o link de confirmacao enviado por email: token opaco em query string ou JWT autocontido?
- **Alternativas consideradas:** Token opaco armazenado no banco (UUID/hex), acessado via query string; JWT assinado com expiracao embutida (sem necessidade de banco para validacao)
- **Decisao:** Token opaco com 128 bits de entropia armazenado na tabela `confirmation_tokens`, enviado como query param
- **Justificativa:** O token opaco permite invalidacao imediata apos o uso (basta setar `used_at`), o que e exigido por NFR-5 e REQ-14. JWTs sao stateless e nao podem ser invalidados sem uma blocklist, o que adicionaria complexidade equivalente a manter o banco de tokens — sem o beneficio da invalidacao imediata. O trade-off do token opaco e a necessidade de consultar o banco em cada confirmacao, mas isso ja e necessario para verificar expiracao e ativar a conta.
- **Requisito relacionado:** NFR-5, REQ-14, REQ-18

### DT-6: Estrategia de armazenamento de avatar — filesystem local vs. cloud storage

- **Problema:** Onde armazenar os arquivos de avatar enviados no cadastro?
- **Alternativas consideradas:** Filesystem local (`public/uploads/avatars/`); cloud storage (S3/R2/GCS); base64 em coluna BLOB no banco
- **Decisao:** Filesystem local em `public/uploads/avatars/`
- **Justificativa:** Stack do projeto nao inclui servico de armazenamento externo. Adicionar S3/R2 apenas para avatar seria overengineering para o escopo do curso. O Next.js serve arquivos de `public/` nativamente sem configuracao extra. O trade-off e que a solucao nao escala horizontalmente (replicas), mas e aceitavel para ambiente de desenvolvimento e curso. Base64 em BLOB nao foi considerado: aumentaria o tamanho das queries e nao e pratica recomendada para arquivos binarios.
- **Requisito relacionado:** REQ-2

### DT-5: Remocao do cadastro pendente apos expiracao — sincrona vs. job assincrono

- **Problema:** Quando remover o cadastro pendente associado a um token expirado: no momento em que o usuario acessa o link expirado, ou via job periodico de limpeza?
- **Alternativas consideradas:** Remocao sincrona no fluxo de confirmacao (quando o link e acessado); job assincrono periodico (cron) de limpeza de registros pendentes expirados
- **Decisao:** Remocao sincrona no `ConfirmAccountUseCase` quando o token expirado e acessado
- **Justificativa:** REQ-15 exige que o cadastro pendente seja removido automaticamente quando o link expirado e acessado. A remocao sincrona atende ao requisito sem adicionar complexidade de agendamento de jobs. O trade-off e que cadastros pendentes cujo link nunca foi acessado permanecrao no banco indefinidamente — mas o PRD delimita que reenvio e recadastro estao fora do escopo, e o volume de registros orphaos pode ser monitorado conforme o PRD sugere.
- **Requisito relacionado:** REQ-15, REQ-16

### DT-7: Escalabilidade para 100 usuarios simultaneos — Next.js single-process vs. multiplos workers

- **Problema:** Como garantir suporte a 100 usuarios simultaneos no fluxo de cadastro e confirmacao (NFR-7) dado que o rate limiting e armazenado em memoria de processo unico?
- **Alternativas consideradas:** Manter o processo unico do Next.js (adequado para o escopo do curso); configurar multiplos workers com PM2 ou Node cluster
- **Decisao:** Processo unico do Next.js com o rate limiter em memoria
- **Justificativa:** O fluxo de cadastro e majoritariamente I/O-bound (banco + email). O Node.js e seu modelo de event loop lidam eficientemente com 100 requisicoes concorrentes sem necessidade de workers adicionais. O trade-off e que o rate limiter em memoria nao e compartilhado entre replicas — aceito para o escopo educacional, conforme DT-3. Em producao real, o correto seria usar Redis para compartilhar o estado do rate limiter entre instancias.
- **Requisito relacionado:** NFR-7

### DT-8: Conformidade com WCAG 2.1 AA — responsabilidade no adapter de apresentacao

- **Problema:** Onde garantir a conformidade WCAG 2.1 AA exigida por NFR-9: no Domain, na API ou nas paginas de apresentacao?
- **Alternativas consideradas:** Validacao automatizada via testes de acessibilidade no CI (axe-core/jest-axe); responsabilidade declarada nos componentes React de apresentacao sem validacao automatizada
- **Decisao:** Conformidade WCAG 2.1 AA e responsabilidade dos adapters de apresentacao (`HomePage`, `RegisterPage`, `ConfirmPage`), com validacao por testes de acessibilidade usando jest-axe nos testes de componente
- **Justificativa:** Acessibilidade e uma preocupacao de interface — nao pertence ao Domain nem a API. Os adapters de apresentacao devem usar HTML semantico, atributos `aria-*` adequados, contraste de cores conforme WCAG 2.1 AA e suporte a navegacao por teclado. O trade-off de usar jest-axe nos testes de componente e que cobre apenas regras automatizaveis — testes manuais com leitores de tela (NVDA/VoiceOver) sao necessarios para cobertura completa, mas estao fora do escopo deste curso.
- **Requisito relacionado:** NFR-9

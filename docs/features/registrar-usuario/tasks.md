# Tasks — Registrar Usuário

## REQ-1 — Exibir formulário de cadastro

> Quando o visitante acessa a página de cadastro, o sistema deve exibir um formulário contendo os campos: nome completo, endereço de email, senha, confirmação de senha, data de nascimento e foto de perfil (opcional).

### T-01: Criar entidade `User` com campos e invariantes de domínio

- [x] Criar a entidade `User` na camada domain com os campos: id (UUID), name, email, password_hash, birth_date, avatar_url (nullable), status (pending/active), created_at e updated_at. A entidade não deve ter dependência de frameworks, ORM ou HTTP.

**Rastreabilidade:** REQ-1 · REQ-8
**Depende de:** —
**Concluída quando:** A entidade `User` existe na camada domain, compila sem erros e pode ser instanciada com os campos descritos sem importar nenhuma dependência externa.

---

### T-02: Criar migration da tabela `users`

- [x] Criar a migration para a tabela `users` com todos os campos do modelo de dados, incluindo constraint UNIQUE no campo `email` e os tipos definidos no design (UUID para id, ENUM para status, DATE para birth_date, VARCHAR nullable para avatar_url).

**Rastreabilidade:** REQ-1 · REQ-8
**Depende de:** T-01
**Concluída quando:** A migration é aplicada com sucesso em banco limpo, a tabela `users` existe com a estrutura correta e a constraint UNIQUE em `email` está ativa.

---

### T-03: Implementar schema de validação de entrada do `POST /api/auth/register`

- [x] Criar o schema Zod (ou equivalente) que valida todos os campos do payload de registro: presença dos obrigatórios (name, email, password, passwordConfirmation, birthDate), formato de email, política de senha (mínimo 8 caracteres com maiúsculas, minúsculas, números e caracteres especiais), coincidência entre password e passwordConfirmation, e avatar_url como opcional.

**Rastreabilidade:** REQ-1 · REQ-2 · REQ-4 · REQ-5 · REQ-6
**Depende de:** —
**Concluída quando:** O schema valida corretamente todos os casos válidos e rejeita cada caso inválido com a mensagem de erro correspondente ao requisito.

---

## REQ-2 — Bloquear envio com campo obrigatório em branco

> Se qualquer campo obrigatório (nome completo, endereço de email, senha, confirmação de senha ou data de nascimento) estiver em branco no momento do envio do formulário, o sistema deve bloquear o envio e exibir uma mensagem de erro indicando qual campo está faltando.

### T-04: Implementar handler de erro HTTP 400 para campos obrigatórios ausentes no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, após a validação pelo schema, retornar HTTP 400 com a estrutura padronizada `{ codigo, mensagem, requestId, timestamp }` quando qualquer campo obrigatório estiver ausente, identificando o campo faltante na mensagem. Nenhum registro deve ser criado nesse caminho.

**Rastreabilidade:** REQ-2 · REQ-7
**Depende de:** T-03
**Concluída quando:** Requisições com campo obrigatório ausente retornam HTTP 400 com mensagem identificando o campo, e nenhum registro é inserido no banco.

---

## REQ-3 — Rejeitar email já cadastrado

> Se o endereço de email informado já estiver associado a uma conta existente, o sistema deve rejeitar o cadastro e exibir a mensagem "Este email já está cadastrado. Tente fazer login ou use outro endereço."

### T-05: Implementar port `UserRepository` (interface)

- [x] Definir a interface `UserRepository` na camada domain com os métodos: `create`, `findByEmail`, `findById`, `delete` e `activate`. A interface não deve referenciar nenhum tipo de ORM, banco de dados ou framework.

**Rastreabilidade:** REQ-3 · REQ-8 · REQ-10 · REQ-12
**Depende de:** T-01
**Concluída quando:** A interface `UserRepository` existe na camada domain, compila sem erros e todos os cinco métodos estão declarados com seus tipos de entrada e retorno corretos.

---

### T-06: Implementar `RegisterUserUseCase` com verificação de unicidade de email

- [x] Implementar o `RegisterUserUseCase` com o método `execute`. Incluir a verificação de unicidade de email via `UserRepository.findByEmail`: se o email já existir, lançar erro com código 409 e a mensagem exigida por REQ-3, sem criar nenhum registro. O caso de uso deve orquestrar todo o fluxo feliz descrito no design (hash de senha, criação do usuário, geração e persistência do token, envio de email e log estruturado).

**Rastreabilidade:** REQ-3 · REQ-7 · REQ-8 · REQ-9 · NFR-6
**Depende de:** T-05
**Concluída quando:** O `RegisterUserUseCase` compila, rejeita email duplicado com código 409 sem criar registros, e executa o fluxo feliz completo com todos os colaboradores injetados.

---

### T-07: Implementar handler de erro HTTP 409 para email duplicado no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, capturar o erro de email duplicado lançado pelo `RegisterUserUseCase` e retornar HTTP 409 com a mensagem "Este email já está cadastrado. Tente fazer login ou use outro endereço." na estrutura padronizada.

**Rastreabilidade:** REQ-3
**Depende de:** T-06
**Concluída quando:** Requisições com email já cadastrado retornam HTTP 409 com a mensagem exata do requisito e estrutura `{ codigo, mensagem, requestId, timestamp }`.

---

### T-08: Implementar `DrizzleUserRepository` — métodos `create` e `findByEmail`

- [x] Implementar a classe `DrizzleUserRepository` como adapter outbound concreto de `UserRepository`, cobrindo os métodos `create` e `findByEmail`. A implementação deve usar Drizzle ORM sobre MySQL e não pode ser importada na camada domain ou nos casos de uso.

**Rastreabilidade:** REQ-3 · REQ-8
**Depende de:** T-02 · T-05
**Concluída quando:** `DrizzleUserRepository.create` persiste um novo usuário no banco e `findByEmail` retorna o registro correto (ou null); constraint UNIQUE do banco é respeitada.

---

### T-09: Cobrir UT-3 — `RegisterUserUseCase.execute()` (unitário)

- [x] Implementar os testes unitários do `RegisterUserUseCase` cobrindo: (a) fluxo feliz com email inédito — hash gerado, usuário criado com status `pending`, token persistido, email enviado e log emitido; (b) email já cadastrado — erro 409, nenhum registro criado; (c) falha no envio de email — falha logada em JSON, conta permanece `pending`. Todos os colaboradores devem ser mockados.

**Rastreabilidade:** REQ-3 · REQ-7 · REQ-8 · REQ-9 · NFR-2 · NFR-6 · Scenario: "Cadastro realizado com dados validos"
**Depende de:** T-06
**Concluída quando:** Os três casos de UT-3 passam; nenhum banco de dados real ou SMTP é utilizado.

---

### T-10: Cobrir IT-1 — `DrizzleUserRepository.create()` e `findByEmail()` (integração)

- [x] Implementar o teste de integração IT-1 cobrindo: (a) criação de usuário com todos os campos e recuperação correta por email; (b) segunda criação com email duplicado lança erro de constraint UNIQUE.

**Rastreabilidade:** REQ-3 · REQ-8
**Depende de:** T-08
**Concluída quando:** Os dois casos de IT-1 passam contra banco MySQL de teste com migration aplicada.

---

## REQ-4 — Rejeitar senha fora da política de segurança

> Se a senha informada não atender à política de segurança (mínimo de 8 caracteres contendo letras maiúsculas, minúsculas, números e caracteres especiais), o sistema deve rejeitar o envio do formulário e exibir a mensagem "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais."

### T-11: Implementar handler de erro HTTP 400 para senha fora da política no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, após a validação pelo schema, retornar HTTP 400 com a mensagem "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais." quando a senha não atender à política. Nenhum registro deve ser criado.

**Rastreabilidade:** REQ-4 · REQ-7
**Depende de:** T-03
**Concluída quando:** Requisições com senha fora da política retornam HTTP 400 com a mensagem exata do requisito; nenhum registro é criado.

---

### T-12: Implementar port `PasswordHasher` (interface)

- [x] Definir a interface `PasswordHasher` na camada domain com o método `hash(password: string): Promise<string>`. A interface não deve referenciar argon2 ou qualquer dependência de infraestrutura.

**Rastreabilidade:** REQ-4 · NFR-2
**Depende de:** —
**Concluída quando:** A interface `PasswordHasher` existe na camada domain, compila sem erros e o `RegisterUserUseCase` a utiliza via injeção de dependência.

---

### T-13: Implementar `Argon2PasswordHasher`

- [x] Implementar a classe `Argon2PasswordHasher` como adapter outbound concreto de `PasswordHasher`, usando argon2id com os parâmetros: 64 MB de memória, 3 iterações e paralelismo 2.

**Rastreabilidade:** REQ-4 · NFR-2
**Depende de:** T-12
**Concluída quando:** `Argon2PasswordHasher.hash()` retorna um hash que começa com `$argon2id$` e é diferente da senha original.

---

### T-14: Cobrir UT-6 — `Argon2PasswordHasher.hash()` (unitário)

- [x] Implementar os testes unitários UT-6 cobrindo: (a) hash gerado é diferente da senha em texto simples; (b) hash da mesma senha é verificável (`verify` retorna `true`).

**Rastreabilidade:** NFR-2 · Scenario: "Cadastro com dados invalidos no formulario"
**Depende de:** T-13
**Concluída quando:** Os dois casos de UT-6 passam; o hash produzido começa com `$argon2id$`.

---

### T-15: Cobrir PT-2 — benchmark de `Argon2PasswordHasher.hash()` (performance)

- [x] Implementar o benchmark PT-2 medindo o tempo de execução de `Argon2PasswordHasher.hash()` com os parâmetros de produção em 10 execuções consecutivas. O teste deve reportar média e valor máximo e falhar se o máximo exceder 1.000 ms.

**Rastreabilidade:** NFR-1 · NFR-2
**Depende de:** T-13
**Concluída quando:** O benchmark executa 10 vezes consecutivas e o valor máximo medido é igual ou inferior a 1.000 ms.

---

### T-16: Cobrir ST-3 — senhas nunca persistidas em texto simples (segurança)

- [x] Implementar o teste ST-3 verificando que, após criação de usuário, o campo `password_hash` no banco não é igual à senha informada e começa com o identificador `$argon2id$`.

**Rastreabilidade:** NFR-2
**Depende de:** T-08 · T-13
**Concluída quando:** O teste ST-3 passa contra banco de teste; o valor de `password_hash` nunca corresponde ao texto original da senha.

---

## REQ-5 — Rejeitar confirmação de senha divergente

> Se a confirmação de senha informada não for idêntica à senha escolhida, o sistema deve rejeitar o envio do formulário e exibir a mensagem "As senhas não coincidem."

### T-17: Implementar handler de erro HTTP 400 para senhas divergentes no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, após a validação pelo schema, retornar HTTP 400 com a mensagem "As senhas não coincidem." quando `password` e `passwordConfirmation` forem diferentes. Nenhum registro deve ser criado.

**Rastreabilidade:** REQ-5 · REQ-7
**Depende de:** T-03
**Concluída quando:** Requisições com senhas divergentes retornam HTTP 400 com a mensagem exata do requisito; nenhum registro é criado.

---

## REQ-6 — Rejeitar email com formato inválido

> Se o endereço de email informado não estiver em formato válido, o sistema deve rejeitar o envio do formulário e exibir a mensagem "Informe um endereço de email válido."

### T-18: Implementar handler de erro HTTP 400 para email com formato inválido no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, após a validação pelo schema, retornar HTTP 400 com a mensagem "Informe um endereço de email válido." quando o email não estiver em formato válido. Nenhum registro deve ser criado.

**Rastreabilidade:** REQ-6 · REQ-7
**Depende de:** T-03
**Concluída quando:** Requisições com email malformado retornam HTTP 400 com a mensagem exata do requisito; nenhum registro é criado.

---

## REQ-7 — Não criar registro em caso de validação inválida

> Se ocorrer qualquer erro de validação durante o envio do formulário de cadastro, o sistema não deve criar nenhum registro de cadastro.

### T-19: Cobrir GH-2 — Scenario Outline "Cadastro com dados invalidos no formulario" (E2E)

- [x] Implementar os step definitions e o teste E2E Gherkin GH-2 cobrindo todas as situações do `Scenario Outline`: email duplicado, senha inválida, senhas divergentes, nome em branco, data de nascimento em branco e email inválido. Para cada situação, verificar a mensagem de erro exibida e a ausência de novo registro no banco.

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7 · Scenario: "Cadastro com dados invalidos no formulario"
**Depende de:** T-04 · T-07 · T-11 · T-17 · T-18
**Concluída quando:** Todos os exemplos do Scenario Outline GH-2 passam no Cypress; o banco de teste não contém novos registros após cada caso inválido.

---

## REQ-8 — Criar cadastro com status "pendente"

> Quando o visitante envia o formulário de cadastro com todos os dados válidos, o sistema deve criar um cadastro com status "pendente".

### T-20: Implementar `RegisterUserHandler` — endpoint `POST /api/auth/register`

- [x] Implementar o Route Handler Next.js em `app/api/auth/register/route.ts`. O handler deve: (1) aplicar o `RateLimiter` antes de processar; (2) validar o payload com o schema; (3) delegar ao `RegisterUserUseCase`; (4) retornar HTTP 200 com `{ message: "Um link de confirmacao foi enviado ao seu email." }` no caminho feliz. Todas as respostas de erro devem seguir a estrutura `{ codigo, mensagem, requestId, timestamp }`.

**Rastreabilidade:** REQ-1 · REQ-8 · REQ-9 · NFR-4
**Depende de:** T-03 · T-06 · T-37
**Concluída quando:** `POST /api/auth/register` com dados válidos retorna HTTP 200 com a mensagem correta; o usuário é persistido com status `pending` no banco.

---

### T-21: Cobrir IT-5 — `RegisterUserHandler POST /api/auth/register` (integração)

- [x] Implementar o teste de integração IT-5 cobrindo todos os casos: dados válidos (HTTP 200, usuário `pending` e token no banco), campo obrigatório ausente (HTTP 400), email inválido (HTTP 400), senha fora da política (HTTP 400), senhas divergentes (HTTP 400), email duplicado (HTTP 409) e quarta tentativa do mesmo IP em 15 min (HTTP 429). Verificar ausência de registros nos casos de erro.

**Rastreabilidade:** REQ-1 · REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7 · REQ-8 · REQ-9 · NFR-4
**Depende de:** T-20
**Concluída quando:** Todos os casos de IT-5 passam contra banco MySQL de teste e Mailhog disponível.

---

### T-22: Cobrir GH-1 — Scenario "Cadastro realizado com dados validos" (E2E)

- [x] Implementar os step definitions e o teste E2E Gherkin GH-1 cobrindo: navegação para `/register`, preenchimento de todos os campos válidos, submissão do formulário, verificação da mensagem de link enviado e verificação da presença do email com link de confirmação na API do Mailhog.

**Rastreabilidade:** REQ-1 · REQ-8 · REQ-9 · Scenario: "Cadastro realizado com dados validos"
**Depende de:** T-20
**Concluída quando:** O Scenario GH-1 passa no Cypress; a mensagem de confirmação é exibida e o email aparece no Mailhog.

---

### T-23: Cobrir PT-1 — latência de `POST /api/auth/register` sob carga (performance)

- [ ] Implementar o teste de carga PT-1 com k6: 10 usuários virtuais simultâneos por 60 segundos enviando dados válidos para `POST /api/auth/register`. O teste deve falhar se o p95 de latência exceder 3.000 ms.

**Rastreabilidade:** NFR-1
**Depende de:** T-20
**Concluída quando:** O script k6 executa sem erros e o p95 medido é igual ou inferior a 3.000 ms em ambiente de teste local.

---

## REQ-9 — Enviar email de confirmação com link único válido por 24 horas

> Quando o visitante envia o formulário de cadastro com todos os dados válidos, o sistema deve enviar um email contendo um link único de confirmação, válido por 24 horas, ao endereço de email informado.

### T-24: Criar entidade `ConfirmationToken` com regras de expiração e reuso

- [ ] Criar a entidade `ConfirmationToken` na camada domain com os campos: id (UUID), user_id, token, expires_at, used_at (nullable), created_at. Implementar os métodos `isExpired()` e `isUsed()` que encapsulam as regras de verificação de expiração e reuso respectivamente.

**Rastreabilidade:** REQ-9 · REQ-12 · REQ-14 · REQ-15 · NFR-3
**Depende de:** T-01
**Concluída quando:** A entidade `ConfirmationToken` existe na camada domain com os dois métodos implementados, sem dependência de frameworks ou ORM.

---

### T-25: Criar migration da tabela `confirmation_tokens`

- [ ] Criar a migration para a tabela `confirmation_tokens` com todos os campos do modelo de dados, incluindo chave estrangeira para `users.id` e os tipos corretos (UUID para id e user_id, VARCHAR para token, TIMESTAMP para expires_at e used_at nullable, TIMESTAMP para created_at).

**Rastreabilidade:** REQ-9 · NFR-3
**Depende de:** T-02 · T-24
**Concluída quando:** A migration é aplicada com sucesso em banco limpo; a tabela `confirmation_tokens` existe com a estrutura correta e a foreign key para `users` está ativa.

---

### T-26: Implementar port `ConfirmationTokenRepository` (interface)

- [ ] Definir a interface `ConfirmationTokenRepository` na camada domain com os métodos: `create`, `findByToken` e `markAsUsed`. A interface não deve referenciar nenhum tipo de ORM, banco de dados ou framework.

**Rastreabilidade:** REQ-9 · REQ-14 · REQ-15 · NFR-3
**Depende de:** T-24
**Concluída quando:** A interface `ConfirmationTokenRepository` existe na camada domain, compila sem erros e os três métodos estão declarados com seus tipos corretos.

---

### T-27: Implementar port `TokenGenerator` (interface)

- [ ] Definir a interface `TokenGenerator` na camada domain com o método `generate(): string`. A interface não deve referenciar `crypto` ou qualquer dependência de infraestrutura, permitindo substituição em testes via injeção de dependência (DT-2).

**Rastreabilidade:** REQ-9 · NFR-3
**Depende de:** —
**Concluída quando:** A interface `TokenGenerator` existe na camada domain, compila sem erros e o `RegisterUserUseCase` a utiliza via injeção de dependência.

---

### T-28: Implementar `CryptoTokenGenerator`

- [ ] Implementar a classe `CryptoTokenGenerator` como adapter outbound concreto de `TokenGenerator`, usando `crypto.randomBytes(16)` do Node.js e codificando o resultado em hex, garantindo 32 caracteres hexadecimais (128 bits de entropia).

**Rastreabilidade:** REQ-9 · NFR-3
**Depende de:** T-27
**Concluída quando:** `CryptoTokenGenerator.generate()` retorna uma string de 32 caracteres hexadecimais; duas chamadas consecutivas retornam valores distintos.

---

### T-29: Implementar port `EmailService` (interface)

- [ ] Definir a interface `EmailService` na camada domain com o método `send(to: string, subject: string, body: string): Promise<void>`. A interface não deve referenciar Mailhog, SMTP ou qualquer dependência de infraestrutura.

**Rastreabilidade:** REQ-9 · NFR-6
**Depende de:** —
**Concluída quando:** A interface `EmailService` existe na camada domain, compila sem erros e o `RegisterUserUseCase` a utiliza via injeção de dependência.

---

### T-30: Implementar `MailhogEmailAdapter`

- [ ] Implementar a classe `MailhogEmailAdapter` como adapter outbound concreto de `EmailService`, conectando ao Mailhog via SMTP para ambiente de desenvolvimento. O adapter deve incluir o template do email de confirmação com o link contendo o token e lançar exceção em caso de falha de conexão SMTP.

**Rastreabilidade:** REQ-9 · NFR-6
**Depende de:** T-29
**Concluída quando:** `MailhogEmailAdapter.send()` entrega o email ao Mailhog; a mensagem aparece na API do Mailhog com destinatário, assunto e link de confirmação corretos.

---

### T-31: Implementar `DrizzleConfirmationTokenRepository` — métodos `create` e `findByToken`

- [ ] Implementar os métodos `create` e `findByToken` na classe `DrizzleConfirmationTokenRepository` como adapter outbound concreto de `ConfirmationTokenRepository`. A implementação deve usar Drizzle ORM sobre MySQL e não pode ser importada na camada domain.

**Rastreabilidade:** REQ-9 · NFR-3
**Depende de:** T-25 · T-26
**Concluída quando:** `DrizzleConfirmationTokenRepository.create` persiste o token com `expires_at` correto e `used_at = null`; `findByToken` retorna o token correto ou null.

---

### T-32: Cobrir UT-5 — `CryptoTokenGenerator.generate()` (unitário)

- [ ] Implementar os testes unitários UT-5 cobrindo: (a) token gerado tem 32 caracteres hexadecimais; (b) duas chamadas consecutivas retornam valores distintos.

**Rastreabilidade:** NFR-3 · Scenario: "Cadastro realizado com dados validos"
**Depende de:** T-28
**Concluída quando:** Os dois casos de UT-5 passam sem dependências externas.

---

### T-33: Cobrir IT-3 — `DrizzleConfirmationTokenRepository.create()`, `findByToken()` e `markAsUsed()` (integração)

- [ ] Implementar o teste de integração IT-3 cobrindo: (a) token persistido com `expires_at` correto e `used_at = null`; (b) `findByToken` retorna o token ou null para inexistente; (c) `markAsUsed` atualiza `used_at` e a chamada subsequente retorna token com `used_at` preenchido.

**Rastreabilidade:** REQ-9 · REQ-14 · REQ-15 · NFR-3
**Depende de:** T-31
**Concluída quando:** Os três casos de IT-3 passam contra banco MySQL de teste com usuário pré-inserido como dependência de FK.

---

### T-34: Cobrir IT-4 — `MailhogEmailAdapter.send()` (integração)

- [ ] Implementar o teste de integração IT-4 cobrindo: (a) email enviado com destinatário, assunto e link de confirmação corretos aparece na API do Mailhog; (b) falha de conexão SMTP lança exceção capturável.

**Rastreabilidade:** REQ-9 · NFR-6
**Depende de:** T-30
**Concluída quando:** Os dois casos de IT-4 passam com Mailhog rodando via Docker Compose.

---

### T-35: Cobrir ST-4 — entropia mínima dos tokens de confirmação (segurança)

- [ ] Implementar o teste ST-4 verificando: (a) token gerado tem 32 caracteres hexadecimais; (b) amostra de 1.000 tokens não contém duplicatas; (c) tokens não seguem padrão previsível (sequencial ou baseado em timestamp).

**Rastreabilidade:** NFR-3
**Depende de:** T-28
**Concluída quando:** Os três casos de ST-4 passam; nenhum dos 1.000 tokens amostrados é duplicado.

---

## REQ-10 — Ativar conta via link de confirmação válido

> Quando o visitante acessa um link de confirmação válido, o sistema deve ativar a conta alterando seu status de "pendente" para "ativo".

### T-36: Implementar `ConfirmAccountUseCase`

- [ ] Implementar o `ConfirmAccountUseCase` com o método `execute(token: string)`. O caso de uso deve: (1) buscar o token via `ConfirmationTokenRepository.findByToken` — retornar erro 404 se não encontrado; (2) verificar `isUsed()` — retornar erro 409 e logar se já utilizado (NFR-7); (3) verificar `isExpired()` — remover cadastro pendente via `UserRepository.delete`, logar e retornar erro 410 se expirado (REQ-12); (4) marcar token como usado via `markAsUsed`; (5) ativar conta via `UserRepository.activate`; (6) logar sucesso (NFR-7).

**Rastreabilidade:** REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15 · NFR-3 · NFR-7
**Depende de:** T-05 · T-24 · T-26
**Concluída quando:** O `ConfirmAccountUseCase` compila e cobre todos os seis caminhos descritos, com todos os colaboradores injetáveis.

---

### T-37: Implementar `DrizzleUserRepository` — métodos `activate` e `delete`

- [ ] Implementar os métodos `activate` e `delete` na classe `DrizzleUserRepository`. O método `activate` deve atualizar o campo `status` para `active`; o método `delete` deve remover o registro do banco.

**Rastreabilidade:** REQ-10 · REQ-12
**Depende de:** T-08
**Concluída quando:** `DrizzleUserRepository.activate` altera o status para `active` no banco; `DrizzleUserRepository.delete` remove o registro e `findById` subsequente retorna null.

---

### T-38: Implementar `DrizzleConfirmationTokenRepository` — método `markAsUsed`

- [ ] Implementar o método `markAsUsed` na classe `DrizzleConfirmationTokenRepository`. O método deve atualizar o campo `used_at` com o timestamp atual para o token identificado pelo seu valor.

**Rastreabilidade:** REQ-10 · REQ-14 · REQ-15 · NFR-3
**Depende de:** T-31
**Concluída quando:** Após `markAsUsed`, `findByToken` retorna o token com `used_at` preenchido com o timestamp da invalidação.

---

### T-39: Implementar `ConfirmAccountHandler` — endpoint `GET /api/auth/confirm`

- [ ] Implementar o Route Handler Next.js em `app/api/auth/confirm/route.ts`. O handler deve: (1) extrair o `token` da query string — retornar HTTP 400 se ausente ou malformado; (2) delegar ao `ConfirmAccountUseCase`; (3) retornar HTTP 200 com `{ message, loginUrl }` no caminho feliz; (4) mapear os erros do caso de uso para HTTP 404, 409 e 410 com a estrutura padronizada `{ codigo, mensagem, requestId, timestamp }`.

**Rastreabilidade:** REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15
**Depende de:** T-36
**Concluída quando:** `GET /api/auth/confirm?token=<válido>` retorna HTTP 200 com mensagem de sucesso e `loginUrl`; os casos de erro retornam os códigos HTTP corretos com estrutura padronizada.

---

### T-40: Cobrir UT-4 — `ConfirmAccountUseCase.execute()` (unitário)

- [ ] Implementar os testes unitários UT-4 cobrindo: (a) fluxo feliz — `used_at` atualizado, status `active`, log emitido; (b) token não encontrado — erro 404; (c) token já utilizado — erro 409, status não alterado; (d) token expirado — cadastro removido, log emitido, erro 410. Todos os colaboradores devem ser mockados.

**Rastreabilidade:** REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15 · NFR-3 · NFR-7 · Scenario: "Confirmacao de conta via link valido"
**Depende de:** T-36
**Concluída quando:** Os quatro casos de UT-4 passam sem banco de dados ou SMTP reais.

---

### T-41: Cobrir IT-2 — `DrizzleUserRepository.activate()` e `delete()` (integração)

- [ ] Implementar o teste de integração IT-2 cobrindo: (a) usuário `pending` tem status atualizado para `active` após `activate`; (b) usuário removido via `delete` não é encontrado por `findById`.

**Rastreabilidade:** REQ-10 · REQ-12
**Depende de:** T-37
**Concluída quando:** Os dois casos de IT-2 passam contra banco MySQL de teste com usuário `pending` pré-inserido.

---

### T-42: Cobrir GH-3 — Scenario "Confirmacao de conta via link valido" (E2E)

- [ ] Implementar os step definitions e o teste E2E Gherkin GH-3 cobrindo: setup de usuário `pending` e token válido no banco, acesso ao link de confirmação, verificação de HTTP 200 com mensagem de ativação e presença de `loginUrl` na resposta.

**Rastreabilidade:** REQ-10 · REQ-11 · Scenario: "Confirmacao de conta via link valido"
**Depende de:** T-39
**Concluída quando:** O Scenario GH-3 passa no Cypress; o banco de teste reflete o usuário com status `active` e o token com `used_at` preenchido.

---

## REQ-11 — Exibir mensagem de sucesso e link de acesso após confirmação

> Quando o visitante acessa um link de confirmação válido, o sistema deve exibir uma mensagem informando que a conta foi ativada com sucesso e apresentar um link para acessar o sistema.

### T-43: Cobrir IT-6 — `ConfirmAccountHandler GET /api/auth/confirm` (integração)

- [ ] Implementar o teste de integração IT-6 cobrindo: (a) token válido — HTTP 200 com `message` e `loginUrl`, status `active` no banco, `used_at` preenchido; (b) token ausente — HTTP 400; (c) token inexistente — HTTP 404; (d) token já utilizado — HTTP 409, status não alterado; (e) token expirado — HTTP 410, cadastro pendente removido.

**Rastreabilidade:** REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15
**Depende de:** T-39
**Concluída quando:** Todos os cinco casos de IT-6 passam contra banco MySQL de teste.

---

## REQ-12 — Rejeitar link expirado e remover cadastro pendente

> Se um link de confirmação estiver expirado (mais de 24 horas desde sua criação), o sistema deve rejeitar a solicitação de confirmação e excluir o cadastro pendente associado.

### T-44: Cobrir UT-1 — `ConfirmationToken.isExpired()` (unitário)

- [ ] Implementar os testes unitários UT-1 cobrindo: (a) token com `expires_at` no futuro retorna `false`; (b) token com `expires_at` no passado retorna `true`; (c) token com `expires_at` exatamente igual ao instante atual retorna `true`.

**Rastreabilidade:** REQ-12 · REQ-13 · Scenario: "Confirmacao de cadastro com link expirado"
**Depende de:** T-24
**Concluída quando:** Os três casos de UT-1 passam sem dependências externas; domínio puro.

---

### T-45: Cobrir GH-4 — Scenario "Confirmacao de cadastro com link expirado" (E2E)

- [ ] Implementar os step definitions e o teste E2E Gherkin GH-4 cobrindo: inserção de usuário `pending` e token com `expires_at = now - 25h` no banco, acesso ao link expirado, verificação de HTTP 410 com mensagem de link expirado, verificação da ausência do cadastro no banco e presença de `registerUrl` na resposta apontando para `/register`.

**Rastreabilidade:** REQ-12 · REQ-13 · Scenario: "Confirmacao de cadastro com link expirado"
**Depende de:** T-39
**Concluída quando:** O Scenario GH-4 passa no Cypress; o banco de teste não contém o cadastro pendente após o acesso ao link expirado.

---

## REQ-13 — Exibir mensagem de link expirado e opção de novo email

> Se um link de confirmação estiver expirado, o sistema deve exibir ao visitante uma mensagem informando que o link expirou e apresentar um link para que o visitante solicite um novo email de confirmação.

_(Coberto pelas tasks T-39, T-43, T-44 e T-45 que implementam e testam o retorno HTTP 410 com a mensagem de expiração e o `registerUrl`.)_

---

## REQ-14 — Rejeitar link já utilizado e não alterar status da conta

> Se um link de confirmação já tiver sido utilizado anteriormente, o sistema deve rejeitar a solicitação e exibir ao visitante uma mensagem informando que o link de confirmação já foi utilizado.

### T-46: Cobrir UT-2 — `ConfirmationToken.isUsed()` (unitário)

- [ ] Implementar os testes unitários UT-2 cobrindo: (a) token com `used_at = null` retorna `false`; (b) token com `used_at` preenchido retorna `true`.

**Rastreabilidade:** REQ-14 · REQ-15 · Scenario: "Confirmacao de cadastro com link ja utilizado"
**Depende de:** T-24
**Concluída quando:** Os dois casos de UT-2 passam sem dependências externas; domínio puro.

---

### T-47: Cobrir GH-5 — Scenario "Confirmacao de cadastro com link ja utilizado" (E2E)

- [ ] Implementar os step definitions e o teste E2E Gherkin GH-5 cobrindo: inserção de usuário `active` e token com `used_at` preenchido no banco, segunda tentativa de acesso ao mesmo link, verificação de HTTP 409 com mensagem de link já utilizado e verificação de que o status do usuário permanece `active`.

**Rastreabilidade:** REQ-14 · REQ-15 · Scenario: "Confirmacao de cadastro com link ja utilizado"
**Depende de:** T-39
**Concluída quando:** O Scenario GH-5 passa no Cypress; o banco de teste confirma que o status do usuário não foi alterado.

---

### T-48: Cobrir ST-2 — prevenção de reuso de token de confirmação (segurança)

- [ ] Implementar o teste ST-2 verificando: (a) primeiro uso do token retorna HTTP 200 e `used_at` é preenchido no banco; (b) segundo uso do mesmo token retorna HTTP 409, status da conta não é alterado e nenhum dado sensível é exposto na resposta.

**Rastreabilidade:** NFR-3 · REQ-14 · REQ-15
**Depende de:** T-39
**Concluída quando:** Os dois casos de ST-2 passam; o segundo uso não altera nenhum estado no banco.

---

## REQ-15 — Não alterar status da conta com link já utilizado

_(REQ-15 é coberto pelas mesmas tasks de REQ-14: T-36, T-38, T-40, T-43, T-46, T-47 e T-48 que implementam e verificam a invariante de que o status da conta não é alterado em caso de reuso de token.)_

---

## NFRs sem REQ direto

### NFR-4 — Rate limiting de tentativas por IP

### T-49: Implementar `RateLimiter`

- [ ] Implementar o middleware `RateLimiter` com contadores por IP em memória (Map com TTL manual), janela de 15 minutos e limite de 3 tentativas. Ao exceder o limite, retornar HTTP 429 com a estrutura padronizada `{ codigo, mensagem, requestId, timestamp }`. Baseado na decisão técnica DT-3 (sem Redis).

**Rastreabilidade:** NFR-4
**Depende de:** —
**Concluída quando:** O `RateLimiter` bloqueia a quarta tentativa do mesmo IP com HTTP 429; IPs distintos têm contadores independentes; contadores expiram após 15 minutos.

---

### T-50: Cobrir UT-7 — `RateLimiter.check()` (unitário)

- [ ] Implementar os testes unitários UT-7 cobrindo: (a) primeira, segunda e terceira tentativas do mesmo IP são permitidas; (b) quarta tentativa do mesmo IP dentro de 15 minutos é bloqueada; (c) tentativa após expiração da janela de 15 minutos é permitida (contador resetado); (d) IPs distintos não compartilham contadores. Usar mock de `Date.now()` para controlar a janela.

**Rastreabilidade:** NFR-4
**Depende de:** T-49
**Concluída quando:** Os quatro casos de UT-7 passam com relógio mockado; nenhum banco de dados ou rede é utilizado.

---

### T-51: Cobrir ST-1 — rate limiting como controle de segurança (segurança)

- [ ] Implementar o teste ST-1 verificando: (a) três primeiras tentativas do mesmo IP são processadas normalmente; (b) quarta tentativa do mesmo IP dentro de 15 min retorna HTTP 429 com estrutura padronizada e nenhum processamento adicional é realizado; (c) tentativa de IP diferente não é bloqueada.

**Rastreabilidade:** NFR-4
**Depende de:** T-49
**Concluída quando:** Os três casos de ST-1 passam; a estrutura da resposta 429 contém `codigo`, `mensagem`, `requestId` e `timestamp`.

---

### NFR-6 — Log estruturado JSON para tentativas de cadastro e falhas de email

### T-52: Implementar log estruturado JSON no `RegisterUserUseCase`

- [ ] No `RegisterUserUseCase`, emitir log estruturado JSON para: (a) cada tentativa de criação de cadastro com os campos `timestamp`, `requestId`, `email` parcialmente mascarado no formato `j***@example.com`, `tipoEvento`; (b) cada falha de envio de email com os campos adicionais `motivoFalha`.

**Rastreabilidade:** NFR-6 · REQ-8 · REQ-9
**Depende de:** T-06
**Concluída quando:** Os logs JSON são emitidos nos dois eventos; o email aparece mascarado no formato exigido; o campo `motivoFalha` é preenchido apenas em casos de falha de email.

---

### NFR-7 — Log estruturado JSON para eventos de confirmação de conta

### T-53: Implementar log estruturado JSON no `ConfirmAccountUseCase`

- [ ] No `ConfirmAccountUseCase`, emitir log estruturado JSON para cada evento de confirmação — bem-sucedido, link expirado e link já utilizado — incluindo os campos: `timestamp`, `resultado`, `tokenId` (identificador do token, não o valor) e `requestId`.

**Rastreabilidade:** NFR-7 · REQ-10 · REQ-12 · REQ-14
**Depende de:** T-36
**Concluída quando:** Os três eventos de confirmação emitem log JSON com os quatro campos exigidos; o campo `tokenId` contém o UUID do token e nunca o valor do token.

---

### T-54: Verificar emissão de logs estruturados JSON nos eventos críticos (integração)

- [ ] Implementar a verificação de logs como parte dos testes IT-5 e IT-6: confirmar que logs JSON são emitidos nos eventos de criação de cadastro, falha de email e confirmação de conta (bem-sucedida, expirada e já utilizada), com os campos exigidos por NFR-6 e NFR-7.

**Rastreabilidade:** NFR-6 · NFR-7
**Depende de:** T-52 · T-53
**Concluída quando:** Os testes de integração verificam a presença e estrutura dos logs JSON nos cinco eventos críticos; o email está mascarado e o `tokenId` nunca expõe o valor do token.

---

### NFR-5 — Disponibilidade 99,9% ao mês

### T-55: Configurar serviço de observabilidade no Docker Compose para o fluxo de cadastro

- [ ] Adicionar ao `docker-compose.yml` os serviços necessários para observabilidade do fluxo de cadastro: Prometheus (métricas), Grafana Loki (logs) e Grafana (dashboards), fixando versões estáveis de cada imagem (sem `latest`). Comentar cada serviço adicionado conforme exigido pelo CLAUDE.md. A disponibilidade de 99,9% será monitorada via Prometheus/Grafana — este NFR não gera teste automatizado.

**Rastreabilidade:** NFR-5
**Depende de:** —
**Concluída quando:** O `docker-compose.yml` inclui os três serviços com versões fixas e comentários; o ambiente sobe sem erros e os serviços de observabilidade estão acessíveis localmente.

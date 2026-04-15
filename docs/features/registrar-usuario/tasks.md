# Tasks — Registrar Usuário

## REQ-1 — Navegar da home para o cadastro

> When the visitor clicks the registration link on the home page, the system shall redirect the browser to the registration page (`/register`).

### T-66: Implementar `HomePage` — página inicial com link de navegação para `/register`

- [x] Implementar a página React Server Component em `src/app/page.tsx` que exibe a página inicial com um link de navegação acessível para `/register`. O link deve usar HTML semântico, ter texto descritivo (não vazio, não genérico), ser navegável por teclado e ser compatível com leitores de tela, conforme NFR-11. A página não deve conter lógica de negócio — apenas apresentação e navegação.

**Rastreabilidade:** REQ-1 · REQ-2 · NFR-1 · NFR-11
**Depende de:** —
**Concluída quando:** A página `/` renderiza com o link para `/register` visível no DOM; o link tem `href="/register"` e texto acessível; a página não importa nenhuma dependência de domínio ou infraestrutura.

---

### T-67: Cobrir UT-9 — `HomePage` acessibilidade WCAG 2.1 AA (unitário)

- [x] Implementar os testes unitários UT-9 cobrindo: (a) renderização da página não gera violações axe reportadas (contraste, labels, estrutura de headings); (b) link de registro presente no DOM com texto acessível (não vazio, não genérico); (c) link de registro navegável por teclado com `href` apontando para `/register`. Usar jest-axe para validação automatizada de acessibilidade.

**Rastreabilidade:** REQ-1 · REQ-2 · NFR-11 · DT-8 · Scenario: "Acessar formulario de cadastro via link na home"
**Depende de:** T-66
**Concluída quando:** Os três casos de UT-9 passam; nenhuma violação axe é reportada para a `HomePage`.

---

### T-68: Cobrir GH-1 — Scenario "Acessar formulario de cadastro via link na home" (E2E)

- [x] Implementar os step definitions e o teste E2E Gherkin GH-1 cobrindo: navegação para `/`, clique no link de registro, verificação de que a URL atual é `/register` e verificação da presença dos campos nome, username, email, senha, confirmação de senha, data de nascimento e foto de perfil no DOM da página `/register`.

**Rastreabilidade:** REQ-1 · REQ-2 · NFR-1 · NFR-11 · Scenario: "Acessar formulario de cadastro via link na home"
**Depende de:** T-66 · T-76
**Concluída quando:** O Scenario GH-1 passa no Cypress; a URL muda para `/register` após o clique no link; os sete campos do formulário estão visíveis no DOM (incluindo o campo username).

---

### T-69: Cobrir PT-1 — latência de navegação home → /register (performance)

- [x] Implementar o teste de performance PT-1 com k6 simulando 10 usuários virtuais simultâneos por 60 segundos executando o ciclo: GET `/` seguido de GET `/register`. O teste deve falhar se o p95 de latência do ciclo completo exceder 1.000 ms.

**Rastreabilidade:** NFR-1 · REQ-1 · Scenario: "Acessar formulario de cadastro via link na home"
**Depende de:** T-66 · T-76
**Concluída quando:** O script k6 executa sem erros; o p95 medido para o ciclo home→/register é igual ou inferior a 1.000 ms.

---

## REQ-2 — Exibir formulário de cadastro com campo username

> When the visitor accesses the registration page, the system shall display a form containing the following fields: full name, username, email address, password, password confirmation, date of birth, and profile photo (optional).

### T-01: Criar entidade `User` com campos e invariantes de domínio (incluindo `username`)

- [x] Criar a entidade `User` na camada domain com os campos: id (UUID), name, username (único na plataforma), email, password_hash, birth_date, avatar_key (nullable, object key do MinIO), status (pending/active), created_at e updated_at. A entidade não deve ter dependência de frameworks, ORM ou HTTP.

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-7
**Depende de:** —
**Concluída quando:** A entidade `User` existe na camada domain, compila sem erros e pode ser instanciada com os campos descritos (incluindo `username`) sem importar nenhuma dependência externa.

---

### T-02: Criar migration da tabela `users` com índice UNIQUE em `username` e `email`

- [x] Criar a migration para a tabela `users` com todos os campos do modelo de dados, incluindo constraints UNIQUE nos campos `email` e `username` e os tipos definidos no design (UUID para id, ENUM para status, DATE para birth_date, VARCHAR nullable para `avatar_key` — object key do MinIO no formato `avatars/<uuid>.<ext>`).

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-7 · REQ-8 · NFR-6 · DT-10
**Depende de:** T-01
**Concluída quando:** A migration é aplicada com sucesso em banco limpo; a tabela `users` existe com a estrutura correta; as constraints UNIQUE em `email` e `username` estão ativas.

---

### T-03: Implementar schema de validação de entrada do `POST /api/auth/register` (incluindo `username`)

- [x] Criar o schema Zod que valida todos os campos textuais do payload de registro recebido via `multipart/form-data`: presença dos obrigatórios (name, username, email, password, passwordConfirmation, birthDate), formato de email, política de senha (mínimo 8 caracteres com maiúsculas, minúsculas, números e caracteres especiais) e coincidência entre password e passwordConfirmation. O campo `avatar` é um arquivo opcional — a validação de tipo MIME e tamanho máximo é responsabilidade do `RegisterUserHandler`.

**Rastreabilidade:** REQ-2 · REQ-6 · REQ-8 · REQ-9 · REQ-10 · REQ-11
**Depende de:** —
**Concluída quando:** O schema valida corretamente todos os casos válidos (incluindo username não vazio) e rejeita cada caso inválido com a mensagem de erro correspondente ao requisito; a ausência do campo `avatar` é aceita sem erro.

---

### T-76: Implementar `RegisterPage` — formulário de cadastro em `/register` com campo username

- [x] Implementar a página React em `src/app/register/page.tsx` que exibe o formulário de cadastro com os campos nome, username, email, senha, confirmação de senha, data de nascimento e foto de perfil. Gerenciar o estado do formulário com react-hook-form e validação Zod no lado do cliente. Submeter os dados ao `POST /api/auth/register` via `multipart/form-data`. Ao receber resposta de sucesso (HTTP 200), exibir a tela de confirmação de envio de email (REQ-5). A página deve estar em conformidade com WCAG 2.1 AA (NFR-11).

**Rastreabilidade:** REQ-2 · REQ-5 · NFR-11 · DT-8
**Depende de:** —
**Concluída quando:** A página `/register` renderiza o formulário com os sete campos (incluindo username); o formulário é submetido como `multipart/form-data`; após HTTP 200 do endpoint, a tela de confirmação de envio é exibida; a página compila sem erros e não importa dependências de domínio.

---

### T-70: Cobrir UT-10 — `RegisterPage` acessibilidade WCAG 2.1 AA e campos do formulário (unitário)

- [x] Implementar os testes unitários UT-10 cobrindo: (a) renderização do formulário não gera violações axe reportadas; (b) campos nome, username, email, senha, confirmação de senha, data de nascimento e foto de perfil presentes no DOM com labels associados corretamente (`htmlFor` / `aria-label`); (c) campos de senha com `type="password"`; (d) mensagens de erro de validação acessíveis via `aria-live` ou `role="alert"` quando exibidas — incluindo mensagem de username duplicado e username em branco. Usar jest-axe para validação automatizada de acessibilidade.

**Rastreabilidade:** REQ-2 · REQ-6 · REQ-7 · NFR-11 · DT-8
**Depende de:** T-76
**Concluída quando:** Os quatro casos de UT-10 passam; nenhuma violação axe é reportada para a `RegisterPage`; o campo username tem label associado no DOM; mensagens de erro de username são acessíveis.

---

### T-73: Implementar port `AvatarAccessPort` (interface)

- [x] Definir a interface `AvatarAccessPort` na camada domain/ports com o método `getPresignedUrl(avatarKey: string, expiresInSeconds: number): Promise<string>`. A interface não deve referenciar o MinIO, nenhum serviço de cloud storage nem qualquer dependência de infraestrutura; apenas o contrato de entrada (object key e TTL em segundos) e retorno (URL temporária como string).

**Rastreabilidade:** REQ-2 · NFR-8 · DT-9
**Depende de:** —
**Concluída quando:** A interface `AvatarAccessPort` existe na camada domain/ports, compila sem erros e o `AvatarAccessHandler` pode referenciá-la via injeção de dependência sem importar nenhum módulo de infraestrutura.

---

### T-61: Implementar port `AvatarStoragePort` (interface)

- [x] Definir a interface `AvatarStoragePort` na camada domain/ports com o método `save(buffer: Buffer, mimeType: string): Promise<string>`. A interface não deve referenciar o filesystem, nenhum serviço de cloud storage nem qualquer dependência de infraestrutura; apenas o contrato de entrada (bytes e tipo) e retorno (object key como string, no formato `avatars/<uuid>.<ext>`).

**Rastreabilidade:** REQ-2 · DT-6
**Depende de:** —
**Concluída quando:** A interface `AvatarStoragePort` existe na camada domain/ports, compila sem erros e o `RegisterUserHandler` pode referenciá-la via injeção de dependência sem importar nenhum módulo de infraestrutura.

---

### T-62: Implementar `MinioAvatarStorageAdapter` — `save()` e `getPresignedUrl()`

- [x] Implementar a classe `MinioAvatarStorageAdapter` como adapter outbound concreto de `AvatarStoragePort` e `AvatarAccessPort`, usando o SDK oficial do MinIO (`minio` para Node.js). O método `save(buffer, mimeType)` deve: derivar a extensão do arquivo a partir do `mimeType` (jpeg → `.jpg`, png → `.png`, webp → `.webp`), gerar um UUID único por chamada como nome do objeto, fazer upload do buffer para o bucket configurado via `putObject` com a object key no formato `avatars/<uuid>.<ext>` e content-type correto, e retornar a object key. O método `getPresignedUrl(avatarKey, expiresInSeconds)` deve gerar uma presigned URL temporária de download via `presignedGetObject` e retornar a URL gerada. Propagar qualquer exceção do SDK ao chamador.

**Rastreabilidade:** REQ-2 · NFR-8 · DT-6 · DT-9
**Depende de:** T-61 · T-73
**Concluída quando:** `MinioAvatarStorageAdapter.save()` faz upload do buffer para o bucket MinIO e retorna a object key no formato `avatars/<uuid>.<ext>`; duas chamadas consecutivas produzem object keys distintas. `getPresignedUrl()` retorna uma URL temporária válida para o objeto armazenado.

---

### T-63: Cobrir UT-7 — `MinioAvatarStorageAdapter.save()` com SDK MinIO mockado (unitário)

- [x] Implementar os testes unitários UT-7 cobrindo: (a) buffer JPEG enviado ao MinIO com extensão `.jpg`; SDK `putObject` chamado com bucket configurado, object key `avatars/<uuid>.jpg` e content-type `image/jpeg`; retorna object key `avatars/<uuid>.jpg`; (b) PNG com extensão `.png` derivada corretamente; (c) WebP com extensão `.webp` derivada corretamente; (d) duas chamadas consecutivas geram object keys distintas (UUID único por chamada); (e) falha de conexão com MinIO (`putObject` lança exceção) é propagada ao chamador. Usar mock do SDK MinIO para testar sem instância real.

**Rastreabilidade:** REQ-2 · DT-6
**Depende de:** T-62
**Concluída quando:** Os cinco casos de UT-7 passam sem instância real do MinIO; o mock do SDK captura as chamadas de `putObject` com os parâmetros corretos.

---

### T-64: Cobrir IT-5 — `MinioAvatarStorageAdapter.save()` com MinIO real (integração)

- [x] Implementar o teste de integração IT-5 cobrindo: (a) buffer JPEG enviado ao MinIO de teste; objeto existe no bucket com a object key retornada; key tem formato `avatars/<uuid>.jpg`; (b) PNG e WebP com extensões derivadas corretamente para cada mimeType; (c) bucket inexistente lança exceção descritiva ao chamador. Usar MinIO rodando via Docker Compose; criar bucket de teste antes; remover os objetos de teste do bucket após cada caso para não poluir o ambiente.

**Rastreabilidade:** REQ-2 · DT-6
**Depende de:** T-62
**Concluída quando:** Os três casos de IT-5 passam com MinIO real via Docker Compose; nenhum objeto de teste permanece no bucket após a execução; credenciais e endpoint MinIO são lidos de variáveis de ambiente de teste.

---

### T-65: Cobrir ST-4 — rejeição de upload com tipo MIME não permitido (segurança)

- [x] Implementar o teste ST-4 verificando que o `RegisterUserHandler` rejeita arquivos de avatar com tipo MIME não permitido, retornando HTTP 400 sem persistir nenhum dado e sem enviar nenhum objeto ao MinIO. Cobrir: (a) upload com `Content-Type: application/pdf` — HTTP 400, nenhum objeto gravado no MinIO, nenhum registro criado; (b) upload com `Content-Type: text/html` — HTTP 400, mesmos critérios; (c) upload com tipo permitido e tamanho acima de 2 MB — HTTP 400, mesmos critérios; (d) upload com tipo permitido e tamanho abaixo de 2 MB — HTTP 200, objeto gravado no MinIO com object key no formato `avatars/<uuid>.<ext>`.

**Rastreabilidade:** REQ-2 · DT-6 · ST-4
**Depende de:** T-20
**Concluída quando:** Os quatro casos de ST-4 passam; nenhum objeto é enviado ao MinIO nos casos de rejeição; a resposta HTTP 400 segue a estrutura padronizada `{ codigo, mensagem, requestId, timestamp }`.

---

## REQ-3 — Criar cadastro com status "pendente"

> When the visitor submits the registration form with all valid data, the system shall create a registration record with status "pending".

### T-20: Implementar `RegisterUserHandler` — endpoint `POST /api/auth/register`

- [x] Implementar o Route Handler Next.js em `app/api/auth/register/route.ts`. O handler deve: (1) aplicar o `RateLimiter` antes de processar; (2) ler o corpo como `multipart/form-data`; (3) se arquivo de avatar presente, validar tipo MIME (`image/jpeg`, `image/png` ou `image/webp`) e tamanho máximo de 2 MB — retornar HTTP 400 se inválido; (4) invocar `MinioAvatarStorageAdapter.save()` para obter a object key no MinIO, retornando HTTP 500 em caso de falha de armazenamento; (5) validar os campos textuais com o schema (incluindo `username` obrigatório); (6) delegar ao `RegisterUserUseCase` com os dados validados incluindo `username` e `avatarKey` (object key do MinIO ou `null`); (7) retornar HTTP 200 com `{ message: "Um link de confirmacao foi enviado ao seu email." }` no caminho feliz. Todas as respostas de erro devem seguir a estrutura `{ codigo, mensagem, requestId, timestamp }`.

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-4 · REQ-7 · NFR-7
**Depende de:** T-03 · T-06 · T-37 · T-56 · T-57 · T-62
**Concluída quando:** `POST /api/auth/register` com dados válidos retorna HTTP 200 com a mensagem correta; o usuário é persistido com status `pending`, `username` e `avatar_key` preenchidos no banco; arquivo com tipo MIME inválido ou acima de 2 MB retorna HTTP 400 sem criar nenhum registro nem enviar nenhum objeto ao MinIO.

---

### T-21: Cobrir IT-6 — `RegisterUserHandler POST /api/auth/register` (integração)

- [x] Implementar o teste de integração IT-6 cobrindo todos os casos: dados válidos sem avatar (HTTP 200, usuário `pending` com `username` e `avatar_key = null` no banco), dados válidos com avatar JPEG válido até 2 MB (HTTP 200, `avatar_key` preenchido com object key no formato `avatars/<uuid>.jpg`, objeto gravado no bucket MinIO de teste), avatar com tipo MIME não permitido como `image/gif` (HTTP 400, nenhum registro criado, nenhum objeto gravado no MinIO), avatar acima de 2 MB (HTTP 400, nenhum registro criado, nenhum objeto gravado no MinIO), campo username ausente em branco (HTTP 400 com mensagem "O campo username e obrigatorio.", nenhum registro criado), username já cadastrado (HTTP 409 com mensagem "Este username ja esta cadastrado. Escolha outro.", nenhum registro criado), campo obrigatório ausente (nome, email, data de nascimento — HTTP 400 com mensagem específica, nenhum registro criado), email inválido (HTTP 400), senha fora da política (HTTP 400), senhas divergentes (HTTP 400), email já cadastrado (HTTP 409) e quarta tentativa do mesmo IP em 15 min (HTTP 429). Remover objetos de avatar gravados no MinIO após os testes.

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7 · REQ-8 · REQ-9 · REQ-10 · REQ-11 · NFR-6 · NFR-7
**Depende de:** T-20
**Concluída quando:** Todos os casos de IT-6 passam contra banco MySQL de teste, Mailhog disponível e MinIO disponível com bucket de teste criado; o campo username é verificado no banco; nenhum objeto de avatar permanece no bucket após os testes.

---

### T-22: Cobrir GH-2 — Scenario "Cadastro realizado com dados validos" (E2E)

- [x] Implementar os step definitions e o teste E2E Gherkin GH-2 cobrindo: navegação para `/register`, preenchimento de todos os campos válidos incluindo username único, submissão do formulário, verificação da mensagem de link enviado e verificação da presença do email com link de confirmação na API do Mailhog.

**Rastreabilidade:** REQ-3 · REQ-4 · REQ-5 · REQ-7 · NFR-3 · Scenario: "Cadastro realizado com dados validos"
**Depende de:** T-20
**Concluída quando:** O Scenario GH-2 passa no Cypress com username único preenchido; a mensagem de confirmação é exibida e o email aparece no Mailhog.

---

### T-23: Cobrir PT-2 — latência de `POST /api/auth/register` sob carga (performance)

- [x] Implementar o teste de carga PT-2 com k6: 10 usuários virtuais simultâneos por 60 segundos enviando dados válidos (com usernames únicos por requisição) para `POST /api/auth/register`. O teste deve falhar se o p95 de latência exceder 3.000 ms.

**Rastreabilidade:** NFR-2 · NFR-6
**Depende de:** T-20
**Concluída quando:** O script k6 executa sem erros; os usernames são distintos por requisição para não gerar conflitos; o p95 medido é igual ou inferior a 3.000 ms em ambiente de teste local.

---

## REQ-4 — Enviar email de confirmação com link único válido por 24 horas

> When the visitor submits the registration form with all valid data, the system shall send an email containing a unique confirmation link, valid for 24 hours, to the provided email address.

### T-24: Criar entidade `ConfirmationToken` com regras de expiração e reuso

- [x] Criar a entidade `ConfirmationToken` na camada domain com os campos: id (UUID), user_id, token, expires_at, used_at (nullable), created_at. Implementar os métodos `isExpired()` e `isUsed()` que encapsulam as regras de verificação de expiração e reuso respectivamente.

**Rastreabilidade:** REQ-4 · REQ-15 · REQ-16 · REQ-18 · NFR-5
**Depende de:** T-01
**Concluída quando:** A entidade `ConfirmationToken` existe na camada domain com os dois métodos implementados, sem dependência de frameworks ou ORM.

---

### T-25: Criar migration da tabela `confirmation_tokens`

- [x] Criar a migration para a tabela `confirmation_tokens` com todos os campos do modelo de dados, incluindo chave estrangeira para `users.id` e os tipos corretos (UUID para id e user_id, VARCHAR para token, TIMESTAMP para expires_at e used_at nullable, TIMESTAMP para created_at).

**Rastreabilidade:** REQ-4 · NFR-5
**Depende de:** T-02 · T-24
**Concluída quando:** A migration é aplicada com sucesso em banco limpo; a tabela `confirmation_tokens` existe com a estrutura correta e a foreign key para `users` está ativa.

---

### T-26: Implementar port `ConfirmationTokenRepository` (interface)

- [x] Definir a interface `ConfirmationTokenRepository` na camada domain com os métodos: `create`, `findByToken` e `markAsUsed`. A interface não deve referenciar nenhum tipo de ORM, banco de dados ou framework.

**Rastreabilidade:** REQ-4 · REQ-15 · REQ-18 · NFR-5
**Depende de:** T-24
**Concluída quando:** A interface `ConfirmationTokenRepository` existe na camada domain, compila sem erros e os três métodos estão declarados com seus tipos corretos.

---

### T-27: Implementar port `TokenGenerator` (interface)

- [x] Definir a interface `TokenGenerator` na camada domain com o método `generate(): string`. A interface não deve referenciar `crypto` ou qualquer dependência de infraestrutura, permitindo substituição em testes via injeção de dependência (DT-2).

**Rastreabilidade:** REQ-4 · NFR-5
**Depende de:** —
**Concluída quando:** A interface `TokenGenerator` existe na camada domain, compila sem erros e o `RegisterUserUseCase` a utiliza via injeção de dependência.

---

### T-28: Implementar `CryptoTokenGenerator`

- [x] Implementar a classe `CryptoTokenGenerator` como adapter outbound concreto de `TokenGenerator`, usando `crypto.randomBytes(16)` do Node.js e codificando o resultado em hex, garantindo 32 caracteres hexadecimais (128 bits de entropia).

**Rastreabilidade:** REQ-4 · NFR-5
**Depende de:** T-27
**Concluída quando:** `CryptoTokenGenerator.generate()` retorna uma string de 32 caracteres hexadecimais; duas chamadas consecutivas retornam valores distintos.

---

### T-29: Implementar port `EmailService` (interface)

- [x] Definir a interface `EmailService` na camada domain com o método `send(to: string, subject: string, body: string): Promise<void>`. A interface não deve referenciar Mailhog, SMTP ou qualquer dependência de infraestrutura.

**Rastreabilidade:** REQ-4 · NFR-3
**Depende de:** —
**Concluída quando:** A interface `EmailService` existe na camada domain, compila sem erros e o `RegisterUserUseCase` a utiliza via injeção de dependência.

---

### T-30: Implementar `MailhogEmailAdapter`

- [x] Implementar a classe `MailhogEmailAdapter` como adapter outbound concreto de `EmailService`, conectando ao Mailhog via SMTP para ambiente de desenvolvimento. O adapter deve incluir o template do email de confirmação com o link contendo o token e lançar exceção em caso de falha de conexão SMTP.

**Rastreabilidade:** REQ-4 · NFR-3
**Depende de:** T-29
**Concluída quando:** `MailhogEmailAdapter.send()` entrega o email ao Mailhog; a mensagem aparece na API do Mailhog com destinatário, assunto e link de confirmação corretos.

---

### T-31: Implementar `DrizzleConfirmationTokenRepository` — métodos `create` e `findByToken`

- [x] Implementar os métodos `create` e `findByToken` na classe `DrizzleConfirmationTokenRepository` como adapter outbound concreto de `ConfirmationTokenRepository`. A implementação deve usar Drizzle ORM sobre MySQL e não pode ser importada na camada domain.

**Rastreabilidade:** REQ-4 · NFR-5
**Depende de:** T-25 · T-26
**Concluída quando:** `DrizzleConfirmationTokenRepository.create` persiste o token com `expires_at` correto e `used_at = null`; `findByToken` retorna o token correto ou null.

---

### T-32: Cobrir UT-5 — `CryptoTokenGenerator.generate()` (unitário)

- [x] Implementar os testes unitários UT-5 cobrindo: (a) token gerado tem 32 caracteres hexadecimais; (b) duas chamadas consecutivas retornam valores distintos.

**Rastreabilidade:** NFR-5 · Scenario: "Cadastro realizado com dados validos"
**Depende de:** T-28
**Concluída quando:** Os dois casos de UT-5 passam sem dependências externas.

---

### T-33: Cobrir IT-3 — `DrizzleConfirmationTokenRepository.create()`, `findByToken()` e `markAsUsed()` (integração)

- [x] Implementar o teste de integração IT-3 cobrindo: (a) token persistido com `expires_at` correto e `used_at = null`; (b) `findByToken` retorna o token ou null para inexistente; (c) `markAsUsed` atualiza `used_at` e a chamada subsequente retorna token com `used_at` preenchido.

**Rastreabilidade:** REQ-4 · REQ-15 · REQ-18 · NFR-5
**Depende de:** T-31
**Concluída quando:** Os três casos de IT-3 passam contra banco MySQL de teste com usuário pré-inserido como dependência de FK.

---

### T-34: Cobrir IT-4 — `MailhogEmailAdapter.send()` (integração)

- [x] Implementar o teste de integração IT-4 cobrindo: (a) email enviado com destinatário, assunto e link de confirmação corretos aparece na API do Mailhog; (b) falha de conexão SMTP lança exceção capturável.

**Rastreabilidade:** REQ-4 · NFR-3 · NFR-12
**Depende de:** T-30
**Concluída quando:** Os dois casos de IT-4 passam com Mailhog rodando via Docker Compose.

---

### T-35: Cobrir ST-5 — entropia mínima dos tokens de confirmação (segurança)

- [x] Implementar o teste ST-5 verificando: (a) token gerado tem 32 caracteres hexadecimais; (b) amostra de 1.000 tokens não contém duplicatas; (c) tokens não seguem padrão previsível (sequencial ou baseado em timestamp).

**Rastreabilidade:** NFR-5
**Depende de:** T-28
**Concluída quando:** Os três casos de ST-5 passam; nenhum dos 1.000 tokens amostrados é duplicado.

> Concluída em 2026-04-01: ST-5 implementado no `crypto-token-generator.test.ts` com os 3 cenários passando (ST-5a, ST-5b, ST-5c).

---

## REQ-5 — Exibir tela pós-cadastro com confirmação de envio de email

> When the visitor submits the registration form with all valid data, the system shall display a screen informing that a confirmation link has been sent to the registered email address.

_(REQ-5 é coberto pela task T-76, que implementa a `RegisterPage` com o comportamento de exibir a tela de confirmação de envio ao receber HTTP 200 do endpoint; e pelas tasks T-22 e T-21 que testam esse comportamento de ponta a ponta e em integração.)_

---

## REQ-6 — Bloquear envio com campo obrigatório em branco (incluindo username)

> If any required field (full name, username, email address, password, password confirmation, or date of birth) is blank at form submission, the system shall block the submission and display an error message indicating which field is missing.

### T-04: Implementar handler de erro HTTP 400 para campos obrigatórios ausentes no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, após a validação pelo schema, retornar HTTP 400 com a estrutura padronizada `{ codigo, mensagem, requestId, timestamp }` quando qualquer campo obrigatório estiver ausente — incluindo username em branco —, identificando o campo faltante na mensagem. Para username em branco, a mensagem deve ser "O campo username e obrigatorio.". Nenhum registro deve ser criado nesse caminho.

**Rastreabilidade:** REQ-6 · REQ-11
**Depende de:** T-03
**Concluída quando:** Requisições com campo obrigatório ausente (incluindo username em branco) retornam HTTP 400 com mensagem identificando o campo, e nenhum registro é inserido no banco.

---

## REQ-7 — Rejeitar username já cadastrado

> If the provided username is already associated with an existing account, the system shall reject the registration and display an error message indicating that the username is already in use.

### T-05: Implementar port `UserRepository` com método `findByUsername` (interface)

- [x] Definir a interface `UserRepository` na camada domain com os métodos: `create`, `findByEmail`, `findByUsername`, `findById`, `delete` e `activate`. A interface não deve referenciar nenhum tipo de ORM, banco de dados ou framework.

**Rastreabilidade:** REQ-7 · REQ-8 · REQ-3 · REQ-13 · REQ-16
**Depende de:** T-01
**Concluída quando:** A interface `UserRepository` existe na camada domain, compila sem erros e todos os seis métodos estão declarados com seus tipos de entrada e retorno corretos.

---

### T-06: Implementar `RegisterUserUseCase` com verificação de unicidade de username e email

- [x] Implementar o `RegisterUserUseCase` com o método `execute`. Incluir: (1) verificação de unicidade de username via `UserRepository.findByUsername` — se o username já existir, lançar erro com código 409 e mensagem "Este username ja esta cadastrado. Escolha outro.", sem criar nenhum registro e sem chamar `findByEmail`; (2) verificação de unicidade de email via `UserRepository.findByEmail` — se o email já existir, lançar erro com código 409 com a mensagem exigida por REQ-8, sem criar nenhum registro. O caso de uso deve orquestrar todo o fluxo feliz: verificar username → verificar email → hash de senha → criar usuário com `username` e `avatarKey` e status `pending` → gerar token → persistir token → enviar email → emitir log estruturado (NFR-12).

**Rastreabilidade:** REQ-7 · REQ-8 · REQ-3 · REQ-4 · REQ-5 · NFR-4 · NFR-12 · DT-10
**Depende de:** T-05
**Concluída quando:** O `RegisterUserUseCase` compila; rejeita username duplicado com código 409 sem chamar `findByEmail`; rejeita email duplicado com código 409; executa o fluxo feliz completo persistindo o `username` no usuário criado.

---

### T-85: Criar migration para adicionar campo `username` com índice UNIQUE na tabela `users`

- [x] Criar a migration Drizzle para adicionar o campo `username` (VARCHAR 50, NOT NULL, UNIQUE) à tabela `users`. Atualizar o schema em `src/lib/db/schema.ts` para incluir o campo `username` com `.unique()`. Rodar `drizzle-kit generate` para gerar o arquivo SQL da migration e garantir que ela aplica sem erros em banco limpo e em banco existente (campo adicionado como `NOT NULL` requer `DEFAULT ''` temporário se houver dados).

**Rastreabilidade:** REQ-2 · REQ-7 · NFR-6 · DT-10
**Depende de:** T-02
**Concluída quando:** A migration é aplicada com sucesso; a tabela `users` contém o campo `username VARCHAR(50) NOT NULL UNIQUE`; o schema Drizzle reflete o novo campo; `drizzle-kit generate` não gera diff pendente.

---

### T-80: Implementar `DrizzleUserRepository` — método `findByUsername`

- [x] Implementar o método `findByUsername` na classe `DrizzleUserRepository`. A busca deve utilizar o índice `UNIQUE(username)` da tabela `users`. Retornar a entidade `User` correspondente quando encontrado, ou `null` quando o username não existir no banco.

**Rastreabilidade:** REQ-7 · NFR-6 · DT-10
**Depende de:** T-08 · T-85
**Concluída quando:** `DrizzleUserRepository.findByUsername` retorna o usuário correto para um username existente e `null` para um username inexistente; a consulta aproveita o índice UNIQUE no banco.

---

### T-07: Implementar handler de erro HTTP 409 para username duplicado no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, capturar o erro de username duplicado lançado pelo `RegisterUserUseCase` e retornar HTTP 409 com a mensagem "Este username ja esta cadastrado. Escolha outro." na estrutura padronizada `{ codigo, mensagem, requestId, timestamp }`.

**Rastreabilidade:** REQ-7 · NFR-6
**Depende de:** T-06
**Concluída quando:** Requisições com username já cadastrado retornam HTTP 409 com a mensagem exata do requisito e estrutura padronizada.

---

### T-09: Cobrir UT-3 — `RegisterUserUseCase.execute()` com verificação de unicidade de username (unitário)

- [x] Implementar os testes unitários do `RegisterUserUseCase` cobrindo: (a) fluxo feliz com username e email inéditos — `UserRepository.findByUsername` chamado primeiro, hash gerado, usuário criado com status `pending` e `username` persistidos, token persistido, email enviado, log emitido; (b) fluxo feliz sem avatar — `avatarKey = null`, usuário criado com `avatar_key = null`; (c) username já cadastrado — `findByUsername` retorna usuário existente → erro 409 com mensagem "Este username ja esta cadastrado. Escolha outro.", `findByEmail` não é chamado, nenhum registro criado; (d) email já cadastrado — `findByUsername` retorna `null`, `findByEmail` retorna usuário existente → erro 409, nenhum registro criado; (e) falha no envio de email — falha logada em JSON com campos timestamp, requestId, email mascarado, tipoEvento e motivoFalha, conta permanece `pending`. Todos os colaboradores devem ser mockados.

**Rastreabilidade:** REQ-7 · REQ-8 · REQ-3 · REQ-4 · REQ-5 · NFR-4 · NFR-12 · Scenario: "Cadastro realizado com dados validos"
**Depende de:** T-06
**Concluída quando:** Os cinco casos de UT-3 passam; nenhum banco de dados real ou SMTP é utilizado; o mock de `findByUsername` é chamado antes de `findByEmail` no caso (c).

---

### T-10: Cobrir IT-1 — `DrizzleUserRepository.create()`, `findByEmail()` e `findByUsername()` (integração)

- [x] Implementar o teste de integração IT-1 cobrindo: (a) usuário criado com `username` e `avatar_key = 'avatars/<uuid>.webp'`; `findByEmail` retorna o registro com a object key correta; `findByUsername` retorna o mesmo registro pelo campo username; (b) usuário criado com `avatar_key = null`; `findByUsername` retorna `avatar_key` como `null`; (c) segunda chamada `create` com o mesmo username lança erro de constraint UNIQUE; (d) segunda chamada `create` com o mesmo email lança erro de constraint UNIQUE; (e) `findByUsername` com username inexistente retorna `null`.

**Rastreabilidade:** REQ-7 · REQ-8 · REQ-3 · NFR-6
**Depende de:** T-08 · T-80
**Concluída quando:** Os cinco casos de IT-1 passam contra banco MySQL de teste com migration aplicada; o índice UNIQUE de username é validado pelo banco.

---

### T-81: Cobrir PT-4 — verificação de unicidade de username com índice UNIQUE sob carga (performance)

- [x] Implementar o teste de carga PT-4 com k6 executando chamadas diretas ao endpoint `POST /api/auth/register` com usernames únicos distintos por VU. Medir a latência da query de unicidade via tracing (OpenTelemetry/Jaeger) ou medição no banco de teste com `EXPLAIN ANALYZE`. O teste deve usar 50 usuários virtuais simultâneos por 60 segundos com pelo menos 200 verificações de unicidade; falhar se o p95 por consulta isolada de `findByUsername` exceder 50 ms.

**Rastreabilidade:** NFR-6 · DT-10
**Depende de:** T-80 · T-20
**Concluída quando:** O script k6 executa com 50 VUs; o p95 da consulta `findByUsername` é igual ou inferior a 50 ms conforme medido via tracing ou `EXPLAIN ANALYZE`.

---

### T-82: Cobrir ST-7 — prevenção de enumeração de usernames (segurança)

- [x] Implementar o teste ST-7 verificando: (a) resposta HTTP 409 para username duplicado retorna mensagem "Este username ja esta cadastrado. Escolha outro." sem revelar dados do usuário existente (email, nome ou status); (b) o tempo de resposta para username duplicado não é significativamente mais rápido que para username inédito com email já cadastrado, de forma que o tempo sozinho não revele o resultado; (c) nenhum campo do usuário existente é incluído na resposta de erro 409.

**Rastreabilidade:** REQ-7 · NFR-6 · DT-10
**Depende de:** T-07
**Concluída quando:** Os três casos de ST-7 passam; a resposta 409 de username duplicado não expõe nenhum dado do usuário existente; a diferença de tempo de resposta entre os dois casos de 409 não permite inferência por timing attack.

---

## REQ-8 — Rejeitar email já cadastrado

> If the provided email address is already associated with an existing account, the system shall reject the registration and display the message "Este email já está cadastrado. Tente fazer login ou use outro endereço."

### T-08: Implementar `DrizzleUserRepository` — métodos `create` e `findByEmail`

- [x] Implementar a classe `DrizzleUserRepository` como adapter outbound concreto de `UserRepository`, cobrindo os métodos `create` e `findByEmail`. A implementação deve usar Drizzle ORM sobre MySQL e não pode ser importada na camada domain ou nos casos de uso. O método `create` deve persistir o campo `username` conforme o modelo de dados.

**Rastreabilidade:** REQ-8 · REQ-3 · REQ-7
**Depende de:** T-02 · T-05
**Concluída quando:** `DrizzleUserRepository.create` persiste um novo usuário no banco (incluindo `username`) e `findByEmail` retorna o registro correto (ou null); constraint UNIQUE do banco é respeitada para ambos `email` e `username`.

---

### T-83: Implementar handler de erro HTTP 409 para email duplicado no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, capturar o erro de email duplicado lançado pelo `RegisterUserUseCase` e retornar HTTP 409 com a mensagem "Este email ja esta cadastrado. Tente fazer login ou use outro endereco." na estrutura padronizada `{ codigo, mensagem, requestId, timestamp }`.

**Rastreabilidade:** REQ-8
**Depende de:** T-06
**Concluída quando:** Requisições com email já cadastrado retornam HTTP 409 com a mensagem exata do requisito e estrutura padronizada.

---

## REQ-9 — Rejeitar senha fora da política de segurança

> If the provided password does not meet the security policy (minimum 8 characters containing uppercase letters, lowercase letters, numbers, and special characters), the system shall reject the form submission and display the message "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais."

### T-11: Implementar handler de erro HTTP 400 para senha fora da política no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, após a validação pelo schema, retornar HTTP 400 com a mensagem "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais." quando a senha não atender à política. Nenhum registro deve ser criado.

**Rastreabilidade:** REQ-9 · REQ-12
**Depende de:** T-03
**Concluída quando:** Requisições com senha fora da política retornam HTTP 400 com a mensagem exata do requisito; nenhum registro é criado.

---

### T-12: Implementar port `PasswordHasher` (interface)

- [x] Definir a interface `PasswordHasher` na camada domain com o método `hash(password: string): Promise<string>`. A interface não deve referenciar argon2 ou qualquer dependência de infraestrutura.

**Rastreabilidade:** REQ-9 · NFR-4
**Depende de:** —
**Concluída quando:** A interface `PasswordHasher` existe na camada domain, compila sem erros e o `RegisterUserUseCase` a utiliza via injeção de dependência.

---

### T-13: Implementar `Argon2PasswordHasher`

- [x] Implementar a classe `Argon2PasswordHasher` como adapter outbound concreto de `PasswordHasher`, usando argon2id com os parâmetros: 64 MB de memória, 3 iterações e paralelismo 2.

**Rastreabilidade:** REQ-9 · NFR-4
**Depende de:** T-12
**Concluída quando:** `Argon2PasswordHasher.hash()` retorna um hash que começa com `$argon2id$` e é diferente da senha original.

---

### T-14: Cobrir UT-6 — `Argon2PasswordHasher.hash()` (unitário)

- [x] Implementar os testes unitários UT-6 cobrindo: (a) hash gerado é diferente da senha em texto simples; (b) hash da mesma senha é verificável (`verify` retorna `true`).

**Rastreabilidade:** NFR-4 · Scenario: "Cadastro com dados invalidos no formulario"
**Depende de:** T-13
**Concluída quando:** Os dois casos de UT-6 passam; o hash produzido começa com `$argon2id$`.

---

### T-15: Cobrir PT-3 — benchmark de `Argon2PasswordHasher.hash()` (performance)

- [x] Implementar o benchmark PT-3 medindo o tempo de execução de `Argon2PasswordHasher.hash()` com os parâmetros de produção em 10 execuções consecutivas. O teste deve reportar média e valor máximo e falhar se o máximo exceder 1.000 ms.

**Rastreabilidade:** NFR-2 · NFR-4
**Depende de:** T-13
**Concluída quando:** O benchmark executa 10 vezes consecutivas e o valor máximo medido é igual ou inferior a 1.000 ms.

---

### T-16: Cobrir ST-3 — senhas nunca persistidas em texto simples (segurança)

- [x] Implementar o teste ST-3 verificando que, após criação de usuário, o campo `password_hash` no banco não é igual à senha informada e começa com o identificador `$argon2id$`.

**Rastreabilidade:** NFR-4
**Depende de:** T-08 · T-13
**Concluída quando:** O teste ST-3 passa contra banco de teste; o valor de `password_hash` nunca corresponde ao texto original da senha.

---

## REQ-10 — Rejeitar confirmação de senha divergente

> If the password confirmation does not match the chosen password, the system shall reject the form submission and display the message "As senhas não coincidem."

### T-17: Implementar handler de erro HTTP 400 para senhas divergentes no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, após a validação pelo schema, retornar HTTP 400 com a mensagem "As senhas não coincidem." quando `password` e `passwordConfirmation` forem diferentes. Nenhum registro deve ser criado.

**Rastreabilidade:** REQ-10 · REQ-12
**Depende de:** T-03
**Concluída quando:** Requisições com senhas divergentes retornam HTTP 400 com a mensagem exata do requisito; nenhum registro é criado.

---

## REQ-11 — Rejeitar email com formato inválido

> If the provided email address is not in a valid format, the system shall reject the form submission and display the message "Informe um endereço de email válido."

### T-18: Implementar handler de erro HTTP 400 para email com formato inválido no `RegisterUserHandler`

- [x] No `RegisterUserHandler`, após a validação pelo schema, retornar HTTP 400 com a mensagem "Informe um endereço de email válido." quando o email não estiver em formato válido. Nenhum registro deve ser criado.

**Rastreabilidade:** REQ-11 · REQ-12
**Depende de:** T-03
**Concluída quando:** Requisições com email malformado retornam HTTP 400 com a mensagem exata do requisito; nenhum registro é criado.

---

## REQ-12 — Não criar registro em caso de validação inválida

> If any validation error occurs during registration form submission, the system shall not create any registration record.

### T-19: Cobrir GH-3 — Scenario Outline "Cadastro com dados invalidos no formulario" (E2E)

- [x] Implementar os step definitions e o teste E2E Gherkin GH-3 cobrindo todas as situações do `Scenario Outline`: username já cadastrado (mensagem "Este username ja esta cadastrado. Escolha outro."), email duplicado, senha inválida, senhas divergentes, nome em branco, username em branco (mensagem "O campo username e obrigatorio."), data de nascimento em branco e email inválido. Para cada situação, verificar a mensagem de erro exibida e a ausência de novo registro no banco.

**Rastreabilidade:** REQ-6 · REQ-7 · REQ-8 · REQ-9 · REQ-10 · REQ-11 · REQ-12 · Scenario: "Cadastro com dados invalidos no formulario"
**Depende de:** T-04 · T-07 · T-11 · T-17 · T-18 · T-83
**Concluída quando:** Todos os exemplos do Scenario Outline GH-3 passam no Cypress (incluindo os dois casos de username); o banco de teste não contém novos registros após cada caso inválido.

---

## REQ-13 — Ativar conta via link de confirmação válido

> When the visitor accesses a valid confirmation link, the system shall activate the account by changing its status from "pending" to "active".

### T-36: Implementar `ConfirmAccountUseCase`

- [x] Implementar o `ConfirmAccountUseCase` com o método `execute(token: string)`. O caso de uso deve: (1) buscar o token via `ConfirmationTokenRepository.findByToken` — retornar erro 404 se não encontrado; (2) verificar `isUsed()` — retornar sinal de already_confirmed e logar se já utilizado (NFR-13); (3) verificar `isExpired()` — remover cadastro pendente via `UserRepository.delete`, logar e retornar sinal de expirado se expirado (REQ-16); (4) marcar token como usado via `markAsUsed`; (5) ativar conta via `UserRepository.activate`; (6) logar sucesso (NFR-13).

**Rastreabilidade:** REQ-13 · REQ-14 · REQ-15 · REQ-16 · REQ-17 · REQ-18 · REQ-19 · NFR-5 · NFR-13
**Depende de:** T-05 · T-24 · T-26
**Concluída quando:** O `ConfirmAccountUseCase` compila e cobre todos os seis caminhos descritos, com todos os colaboradores injetáveis.

> Concluída em 2026-04-01: Use case implementado em `confirm-account.use-case.ts` com 4 testes passando (UT-4a, UT-4b, UT-4c, UT-4d).

---

### T-37: Implementar `DrizzleUserRepository` — métodos `activate` e `delete`

- [x] Implementar os métodos `activate` e `delete` na classe `DrizzleUserRepository`. O método `activate` deve atualizar o campo `status` para `active`; o método `delete` deve remover o registro do banco.

**Rastreabilidade:** REQ-13 · REQ-16
**Depende de:** T-08
**Concluída quando:** `DrizzleUserRepository.activate` altera o status para `active` no banco; `DrizzleUserRepository.delete` remove o registro e `findById` subsequente retorna null.

---

### T-38: Implementar `DrizzleConfirmationTokenRepository` — método `markAsUsed`

- [x] Implementar o método `markAsUsed` na classe `DrizzleConfirmationTokenRepository`. O método deve atualizar o campo `used_at` com o timestamp atual para o token identificado pelo seu valor.

**Rastreabilidade:** REQ-13 · REQ-15 · REQ-18 · NFR-5
**Depende de:** T-31
**Concluída quando:** Após `markAsUsed`, `findByToken` retorna o token com `used_at` preenchido com o timestamp da invalidação.

---

### T-39: Implementar `ConfirmAccountHandler` — endpoint `GET /api/auth/confirm`

- [x] Implementar o Route Handler Next.js em `app/api/auth/confirm/route.ts`. O handler deve: (1) extrair o `token` da query string — redirecionar para `/confirm?error=invalid_token` se ausente ou malformado; (2) delegar ao `ConfirmAccountUseCase`; (3) retornar HTTP 302 Redirect para `/confirm?status=success` no caminho feliz; (4) mapear os erros do caso de uso para HTTP 302 Redirect: não encontrado → `/confirm?error=not_found`, já utilizado → `/confirm?error=already_confirmed`, expirado → `/confirm?error=expired`.

**Rastreabilidade:** REQ-13 · REQ-14 · REQ-15 · REQ-16 · REQ-17 · REQ-18 · REQ-19
**Depende de:** T-36
**Concluída quando:** `GET /api/auth/confirm?token=<válido>` retorna HTTP 302 Redirect para `/confirm?status=success`; os casos de erro retornam HTTP 302 com os parâmetros `error` corretos.

---

### T-40: Cobrir UT-4 — `ConfirmAccountUseCase.execute()` (unitário)

- [x] Implementar os testes unitários UT-4 cobrindo: (a) fluxo feliz — `used_at` atualizado, status `active`, log emitido; (b) token não encontrado — sinal de not_found; (c) token já utilizado — sinal de already_confirmed, status não alterado; (d) token expirado — cadastro removido, log emitido, sinal de expirado. Todos os colaboradores devem ser mockados.

**Rastreabilidade:** REQ-13 · REQ-14 · REQ-15 · REQ-16 · REQ-17 · REQ-18 · REQ-19 · NFR-5 · NFR-13 · Scenario: "Confirmacao de conta via link valido"
**Depende de:** T-36
**Concluída quando:** Os quatro casos de UT-4 passam sem banco de dados ou SMTP reais.

---

### T-41: Cobrir IT-2 — `DrizzleUserRepository.activate()` e `delete()` (integração)

- [x] Implementar o teste de integração IT-2 cobrindo: (a) usuário `pending` tem status atualizado para `active` após `activate`; (b) usuário removido via `delete` não é encontrado por `findById`.

**Rastreabilidade:** REQ-13 · REQ-16
**Depende de:** T-37
**Concluída quando:** Os dois casos de IT-2 passam contra banco MySQL de teste com usuário `pending` pré-inserido.

---

### T-42: Cobrir GH-4 — Scenario "Confirmacao de conta via link valido" (E2E)

- [x] Implementar os step definitions e o teste E2E Gherkin GH-4 cobrindo: setup de usuário `pending` e token válido no banco, acesso ao link de confirmação, verificação de redirect HTTP 302 para `/confirm?status=success`, navegação para a página `/confirm` e verificação da mensagem de ativação e do link de acesso ao sistema.

**Rastreabilidade:** REQ-13 · REQ-14 · REQ-15 · Scenario: "Confirmacao de conta via link valido"
**Depende de:** T-39
**Concluída quando:** O Scenario GH-4 passa no Cypress; o banco de teste reflete o usuário com status `active` e o token com `used_at` preenchido.

---

## REQ-14 — Exibir mensagem de sucesso e link de acesso após confirmação

> When the visitor accesses a valid confirmation link, the system shall redirect the browser to `/confirm` and display a message informing that the account has been successfully activated, along with a link to access the system.

### T-43: Cobrir IT-7 — `ConfirmAccountHandler GET /api/auth/confirm` (integração)

- [x] Implementar o teste de integração IT-7 cobrindo: (a) token válido — HTTP 302 Redirect para `/confirm?status=success`, status `active` no banco, `used_at` preenchido; (b) token ausente — HTTP 302 Redirect para `/confirm?error=invalid_token`; (c) token inexistente — HTTP 302 Redirect para `/confirm?error=not_found`; (d) token já utilizado — HTTP 302 Redirect para `/confirm?error=already_confirmed`, status não alterado; (e) token expirado — HTTP 302 Redirect para `/confirm?error=expired`, cadastro pendente removido.

**Rastreabilidade:** REQ-13 · REQ-14 · REQ-15 · REQ-16 · REQ-17 · REQ-18 · REQ-19
**Depende de:** T-39
**Concluída quando:** Todos os cinco casos de IT-7 passam contra banco MySQL de teste; todos os redirects apontam para `/confirm` com os parâmetros corretos.

---

### T-71: Criar página `/confirm` (`src/app/confirm/page.tsx`)

- [x] Implementar a página React Server Component em `src/app/confirm/page.tsx` que lê os `searchParams` (`status` e `error`) e renderiza HTML de sucesso ou erro no navegador. Quando `status=success`: exibir mensagem de conta ativada com sucesso e link para acessar o sistema. Quando `error=expired`: exibir mensagem de link expirado e link para `/register`. Quando `error=already_confirmed`: exibir mensagem de link já utilizado. Quando `error=not_found` ou `error=invalid_token`: exibir mensagem de link inválido. A página não deve conter lógica de negócio — apenas apresentação baseada nos query params.

**Rastreabilidade:** REQ-14 · REQ-17 · REQ-18
**Depende de:** T-39
**Concluída quando:** A página `/confirm` renderiza HTML correto para cada combinação de `status`/`error`; o link de login aparece no caso de sucesso; o link para `/register` aparece no caso de expiração.

---

## REQ-15 — Invalidar o token imediatamente após o primeiro uso bem-sucedido

> When the visitor accesses a valid confirmation link for the first time, the system shall invalidate that confirmation link immediately after the successful activation, preventing it from being used again.

_(REQ-15 é coberto pelas tasks T-38 que implementa o método `markAsUsed` no repositório, T-36 que orquestra a invalidação imediata no caso de uso, e T-48 que verifica a prevenção de reuso como teste de segurança ST-2. A rastreabilidade está declarada nessas tasks.)_

---

## REQ-16 — Rejeitar link expirado e remover cadastro pendente

> If a confirmation link has expired (more than 24 hours since its creation), the system shall reject the confirmation request and delete the pending registration associated with that link.

### T-44: Cobrir UT-1 — `ConfirmationToken.isExpired()` (unitário)

- [x] Implementar os testes unitários UT-1 cobrindo: (a) token com `expires_at` no futuro retorna `false`; (b) token com `expires_at` no passado retorna `true`; (c) token com `expires_at` exatamente igual ao instante atual retorna `true`.

**Rastreabilidade:** REQ-16 · REQ-17 · Scenario: "Confirmacao de cadastro com link expirado"
**Depende de:** T-24
**Concluída quando:** Os três casos de UT-1 passam sem dependências externas; domínio puro.

---

### T-45: Cobrir GH-5 — Scenario "Confirmacao de cadastro com link expirado" (E2E)

- [x] Implementar os step definitions e o teste E2E Gherkin GH-5 cobrindo: inserção de usuário `pending` e token com `expires_at = now - 25h` no banco, acesso ao link expirado, verificação de redirect HTTP 302 para `/confirm?error=expired` com mensagem de link expirado na página `/confirm`, verificação da ausência do cadastro no banco e presença de link para `/register` na resposta.

**Rastreabilidade:** REQ-16 · REQ-17 · Scenario: "Confirmacao de cadastro com link expirado"
**Depende de:** T-39
**Concluída quando:** O Scenario GH-5 passa no Cypress; o banco de teste não contém o cadastro pendente após o acesso ao link expirado.

---

## REQ-17 — Exibir mensagem de link expirado e opção de novo cadastro

> If a confirmation link has expired, the system shall redirect the browser to `/confirm` displaying a message informing that the link has expired and that the visitor must register again, along with a link to the registration page (`/register`).

_(REQ-17 é coberto pelas tasks T-39, T-43, T-44, T-45 e T-71 que implementam e testam o retorno HTTP 302 com `error=expired`, a mensagem de expiração e o link para `/register` na página `/confirm`.)_

---

## REQ-18 — Rejeitar link já utilizado

> If a confirmation link has already been used, the system shall reject the request and redirect the browser to `/confirm` displaying a message informing that the confirmation link has already been used.

### T-46: Cobrir UT-2 — `ConfirmationToken.isUsed()` (unitário)

- [x] Implementar os testes unitários UT-2 cobrindo: (a) token com `used_at = null` retorna `false`; (b) token com `used_at` preenchido retorna `true`.

**Rastreabilidade:** REQ-18 · REQ-19 · Scenario: "Confirmacao de cadastro com link ja utilizado"
**Depende de:** T-24
**Concluída quando:** Os dois casos de UT-2 passam sem dependências externas; domínio puro.

---

### T-47: Cobrir GH-6 — Scenario "Confirmacao de cadastro com link ja utilizado" (E2E)

- [x] Implementar os step definitions e o teste E2E Gherkin GH-6 cobrindo: inserção de usuário `active` e token com `used_at` preenchido no banco, segunda tentativa de acesso ao mesmo link, verificação de redirect HTTP 302 para `/confirm?error=already_confirmed` com mensagem de link já utilizado na página `/confirm`, e verificação de que o status do usuário permanece `active`.

**Rastreabilidade:** REQ-18 · REQ-19 · Scenario: "Confirmacao de cadastro com link ja utilizado"
**Depende de:** T-39
**Concluída quando:** O Scenario GH-6 passa no Cypress; o banco de teste confirma que o status do usuário não foi alterado.

---

### T-48: Cobrir ST-2 — prevenção de reuso de token de confirmação (segurança)

- [x] Implementar o teste ST-2 verificando: (a) primeiro uso do token retorna HTTP 302 Redirect para `/confirm?status=success` e `used_at` é preenchido no banco; (b) segundo uso do mesmo token retorna HTTP 302 Redirect para `/confirm?error=already_confirmed`, status da conta não é alterado e nenhum dado sensível é exposto na resposta.

**Rastreabilidade:** NFR-5 · REQ-15 · REQ-18 · REQ-19
**Depende de:** T-39
**Concluída quando:** Os dois casos de ST-2 passam; o segundo uso não altera nenhum estado no banco.

---

## REQ-19 — Não alterar status da conta com link já utilizado

> If a confirmation link has already been used, the system shall not alter the status of the already active account.

_(REQ-19 é coberto pelas mesmas tasks de REQ-18: T-36, T-38, T-40, T-43, T-46, T-47 e T-48 que implementam e verificam a invariante de que o status da conta não é alterado em caso de reuso de token.)_

---

## NFRs sem REQ direto

### NFR-6 — Validação de unicidade de username em tempo real

### T-84: Verificar cobertura de unicidade de username no lado do cliente (UI)

- [x] Garantir que a `RegisterPage` (T-76) exibe a mensagem de erro "Este username ja esta cadastrado. Escolha outro." ao receber HTTP 409 do endpoint com mensagem de username duplicado. A exibição deve ser acessível via `aria-live` ou `role="alert"`. Nenhuma lógica de verificação assíncrona de username fora do submit está prevista no design — a validação ocorre no envio do formulário.

**Rastreabilidade:** NFR-6 · REQ-7
**Depende de:** T-76 · T-07
**Concluída quando:** Ao receber HTTP 409 com mensagem de username duplicado, a `RegisterPage` exibe o erro no campo username de forma acessível; o comportamento é coberto pelo UT-10 (T-70).

---

### NFR-7 — Rate limiting de tentativas por IP

### T-49: Implementar `RateLimiter`

- [x] Implementar o middleware `RateLimiter` com contadores por IP em memória (Map com TTL manual), janela de 15 minutos e limite de 3 tentativas. Ao exceder o limite, retornar HTTP 429 com a estrutura padronizada `{ codigo, mensagem, requestId, timestamp }`. Baseado na decisão técnica DT-3 (sem Redis).

**Rastreabilidade:** NFR-7
**Depende de:** —
**Concluída quando:** O `RateLimiter` bloqueia a quarta tentativa do mesmo IP com HTTP 429; IPs distintos têm contadores independentes; contadores expiram após 15 minutos.

---

### T-50: Cobrir UT-8 — `RateLimiter.check()` (unitário)

- [x] Implementar os testes unitários UT-8 cobrindo: (a) primeira, segunda e terceira tentativas do mesmo IP são permitidas; (b) quarta tentativa do mesmo IP dentro de 15 minutos é bloqueada; (c) tentativa após expiração da janela de 15 minutos é permitida (contador resetado); (d) IPs distintos não compartilham contadores. Usar mock de `Date.now()` para controlar a janela.

**Rastreabilidade:** NFR-7
**Depende de:** T-49
**Concluída quando:** Os quatro casos de UT-8 passam com relógio mockado; nenhum banco de dados ou rede é utilizado.

---

### T-51: Cobrir ST-1 — rate limiting como controle de segurança (segurança)

- [x] Implementar o teste ST-1 verificando: (a) três primeiras tentativas do mesmo IP são processadas normalmente; (b) quarta tentativa do mesmo IP dentro de 15 min retorna HTTP 429 com estrutura padronizada e nenhum processamento adicional é realizado; (c) tentativa de IP diferente não é bloqueada.

**Rastreabilidade:** NFR-7
**Depende de:** T-49
**Concluída quando:** Os três casos de ST-1 passam; a estrutura da resposta 429 contém `codigo`, `mensagem`, `requestId` e `timestamp`.

---

### NFR-12 — Log estruturado JSON para tentativas de cadastro e falhas de email

### T-52: Implementar log estruturado JSON no `RegisterUserUseCase`

- [x] No `RegisterUserUseCase`, emitir log estruturado JSON para: (a) cada tentativa de criação de cadastro com os campos `timestamp`, `requestId`, `email` parcialmente mascarado no formato `j***@example.com`, `tipoEvento`; (b) cada falha de envio de email com os campos adicionais `motivoFalha`.

**Rastreabilidade:** NFR-12 · REQ-3 · REQ-4
**Depende de:** T-06
**Concluída quando:** Os logs JSON são emitidos nos dois eventos; o email aparece mascarado no formato exigido; o campo `motivoFalha` é preenchido apenas em casos de falha de email.

---

### NFR-13 — Log estruturado JSON para eventos de confirmação de conta

### T-53: Implementar log estruturado JSON no `ConfirmAccountUseCase`

- [x] No `ConfirmAccountUseCase`, emitir log estruturado JSON para cada evento de confirmação — bem-sucedido, link expirado e link já utilizado — incluindo os campos: `timestamp`, `resultado`, `tokenId` (identificador do token, não o valor) e `requestId`.

**Rastreabilidade:** NFR-13 · REQ-13 · REQ-16 · REQ-18
**Depende de:** T-36
**Concluída quando:** Os três eventos de confirmação emitem log JSON com os quatro campos exigidos; o campo `tokenId` contém o UUID do token e nunca o valor do token.

---

### T-54: Verificar emissão de logs estruturados JSON nos eventos críticos (integração)

- [x] Implementar a verificação de logs como parte dos testes IT-4 e IT-6: confirmar que logs JSON são emitidos nos eventos de criação de cadastro, falha de email e confirmação de conta (bem-sucedida, expirada e já utilizada), com os campos exigidos por NFR-12 e NFR-13.

**Rastreabilidade:** NFR-12 · NFR-13
**Depende de:** T-52 · T-53
**Concluída quando:** Os testes de integração verificam a presença e estrutura dos logs JSON nos cinco eventos críticos; o email está mascarado e o `tokenId` nunca expõe o valor do token.

---

### NFR-10 — Disponibilidade 99,9% ao mês

### T-55: Configurar serviços de observabilidade no Docker Compose para o fluxo de cadastro

- [x] Adicionar ao `docker-compose.yml` os serviços necessários para observabilidade do fluxo de cadastro: Prometheus (métricas), Grafana Loki (logs) e Grafana (dashboards), fixando versões estáveis de cada imagem (sem `latest`). Comentar cada serviço adicionado conforme exigido pelo CLAUDE.md. A disponibilidade de 99,9% será monitorada via Prometheus/Grafana — este NFR não gera teste automatizado.

**Rastreabilidade:** NFR-10
**Depende de:** —
**Concluída quando:** O `docker-compose.yml` inclui os três serviços com versões fixas e comentários; o ambiente sobe sem erros e os serviços de observabilidade estão acessíveis localmente.

---

### NFR-14 — Logs entregues ao Loki e consultáveis por requestId

### T-56: Inicializar o SDK OpenTelemetry no Next.js

- [x] Criar `src/instrumentation.ts` exportando a função `register()` que inicializa o `NodeSDK` (importando de `src/lib/observability/register.ts`). Habilitar `experimental.instrumentationHook: true` no `next.config.ts`. Garantir que o SDK só sobe no runtime `nodejs` (guard `process.env.NEXT_RUNTIME === 'nodejs'`).

**Rastreabilidade:** NFR-14
**Depende de:** T-55
**Concluída quando:** O servidor Next.js inicializa o SDK OpenTelemetry na subida; traces aparecem no Jaeger ao fazer uma requisição ao endpoint `/api/auth/register`.

---

### T-57: Conectar Pino ao Loki via transport

- [x] Instalar `pino-loki` e configurar como transport no `src/lib/observability/logger.ts` quando `NODE_ENV !== 'development'`, apontando para `LOKI_URL` (default `http://localhost:3100`). Adicionar `LOKI_URL=http://localhost:3100` ao `.env.example`. O transport deve incluir o label `{ job: "kanban-app" }`.

**Rastreabilidade:** NFR-14
**Depende de:** T-56
**Concluída quando:** Após subir o ambiente com `docker compose up`, um `logger.info(...)` é recuperável no Grafana Explore com o filtro `{job="kanban-app"}`; logs de NFR-12 e NFR-13 aparecem com `requestId` e `tipoEvento` nos campos.

---

### NFR-9 — Suporte a 100 usuários simultâneos

### T-72: Cobrir PT-5 — suporte a 100 usuários simultâneos no fluxo completo (performance)

- [x] Implementar o teste de carga PT-5 com k6 simulando 100 usuários virtuais simultâneos por 60 segundos executando o fluxo completo: `POST /api/auth/register` seguido de `GET /api/auth/confirm?token=<valor>`. O teste deve falhar se a taxa de erros for maior que 0% ou se o p95 de latência exceder 3.000 ms.

**Rastreabilidade:** NFR-9
**Depende de:** T-20 · T-39
**Concluída quando:** O script k6 executa com 100 usuários virtuais simultâneos; taxa de erros é 0% e p95 é igual ou inferior a 3.000 ms em ambiente de teste local.

---

### NFR-8 — Acesso protegido à foto de perfil: autenticação obrigatória e rejeição por status de conta

### T-74: Implementar `AvatarAccessHandler` — endpoint `GET /api/users/[userId]/avatar`

- [x] Implementar o Route Handler Next.js em `app/api/users/[userId]/avatar/route.ts`. O handler deve: (1) verificar a sessão ativa via next-auth (`getServerSession`) — se ausente ou inválida, emitir log estruturado JSON com `{ timestamp, userId: null, ownerUserId: userId, tipoRejeicao: 401, requestId }` e retornar HTTP 401; (2) consultar `UserRepository.findById(userId)` — retornar HTTP 404 se o usuário não for encontrado; (3) verificar o status da conta do proprietário — se `inactive` ou `blocked`, emitir log estruturado JSON com `{ timestamp, userId: <id do requisitor>, ownerUserId: userId, tipoRejeicao: 403, requestId }` e retornar HTTP 403; (4) verificar se `User.avatar_key` é não nulo — retornar HTTP 404 se nulo; (5) invocar `AvatarAccessPort.getPresignedUrl(avatarKey, 60)` para obter a URL temporária de download; (6) retornar HTTP 302 Redirect para a presigned URL gerada. Todas as respostas de erro devem seguir a estrutura padronizada `{ codigo, mensagem, requestId, timestamp }`.

**Rastreabilidade:** NFR-8 · REQ-2 · DT-9
**Depende de:** T-05 · T-62 · T-73
**Concluída quando:** `GET /api/users/[userId]/avatar` com sessão válida e proprietário ativo retorna HTTP 302 Redirect para presigned URL do MinIO; requisição sem sessão retorna HTTP 401 com log JSON emitido; proprietário com status `inactive` ou `blocked` retorna HTTP 403 com log JSON emitido; proprietário inexistente ou sem avatar retorna HTTP 404 sem log de rejeição de segurança.

---

### T-75: Cobrir UT-11 — `AvatarAccessHandler` lógica de autenticação e controle de acesso (unitário)

- [x] Implementar os testes unitários UT-11 cobrindo: (a) caminho feliz — sessão válida, proprietário `active` e `avatar_key` preenchido → `AvatarAccessPort.getPresignedUrl` chamado → HTTP 302 Redirect para a URL gerada; (b) requisição sem sessão — `getServerSession` retorna `null` → log JSON emitido com `{ timestamp, userId: null, ownerUserId, tipoRejeicao: 401, requestId }` → HTTP 401; (c) sessão presente, proprietário `inactive` → log JSON emitido com `{ timestamp, userId, ownerUserId, tipoRejeicao: 403, requestId }` → HTTP 403; (d) sessão presente, proprietário `blocked` → log JSON emitido idem → HTTP 403; (e) proprietário não encontrado no banco → HTTP 404 sem log de rejeição de segurança; (f) proprietário encontrado mas `avatar_key = null` → HTTP 404 sem log de rejeição de segurança. Mockar `getServerSession`, `UserRepository`, `AvatarAccessPort` e o logger.

**Rastreabilidade:** NFR-8 · REQ-2
**Depende de:** T-74
**Concluída quando:** Os seis casos de UT-11 passam sem banco de dados, MinIO ou next-auth reais; o logger mockado captura os campos obrigatórios nos eventos de rejeição.

---

### T-78: Cobrir IT-8 — `AvatarAccessHandler GET /api/users/[userId]/avatar` (integração)

- [x] Implementar o teste de integração IT-8 cobrindo: (a) sessão ausente → HTTP 401; log JSON emitido com `{ timestamp, userId: null, ownerUserId, tipoRejeicao: 401, requestId }`; nenhuma presigned URL gerada; (b) sessão válida, proprietário `active` e `avatar_key` preenchido → HTTP 302 Redirect para presigned URL temporária do MinIO; (c) sessão válida, proprietário `inactive` → HTTP 403; log JSON emitido; (d) sessão válida, proprietário `blocked` → HTTP 403; log JSON emitido; (e) sessão válida, userId inexistente no banco → HTTP 404; nenhum log de rejeição; (f) sessão válida, proprietário com `avatar_key = null` → HTTP 404; nenhum log de rejeição. Usar banco MySQL de teste e MinIO de teste via Docker Compose; pré-inserir usuários com diferentes status; pré-carregar objeto de avatar no bucket MinIO para o caso do caminho feliz; mockar ou configurar a sessão next-auth para os casos autenticados.

**Rastreabilidade:** NFR-8 · REQ-2
**Depende de:** T-74
**Concluída quando:** Todos os seis casos de IT-8 passam com banco MySQL de teste e MinIO reais; os logs JSON contêm os campos obrigatórios do NFR-8; nenhuma presigned URL é gerada nos casos de rejeição 401/403.

---

### T-77: Cobrir ST-6 — acesso não autenticado e acesso a conta bloqueada ao endpoint de avatar (segurança)

- [x] Implementar o teste ST-6 verificando: (a) requisição sem token de sessão para `GET /api/users/<userId>/avatar` → HTTP 401; log JSON contém `{ timestamp, userId: null, ownerUserId: <userId>, tipoRejeicao: 401, requestId }`; nenhum campo sensível exposto na resposta; (b) requisição com sessão válida para avatar de usuário com status `inactive` → HTTP 403; log JSON contém `{ timestamp, userId: <requisitor>, ownerUserId: <userId>, tipoRejeicao: 403, requestId }`; nenhuma presigned URL gerada; (c) requisição com sessão válida para avatar de usuário com status `blocked` → HTTP 403; log JSON idem; (d) requisição com sessão válida para avatar de usuário com status `active` → HTTP 302 Redirect para presigned URL; nenhum log de rejeição emitido.

**Rastreabilidade:** NFR-8 · REQ-2
**Depende de:** T-74
**Concluída quando:** Os quatro casos de ST-6 passam; os campos obrigatórios do log JSON estão presentes e corretos nos casos de rejeição; nenhuma informação sensível é exposta nas respostas de erro.

# Estratégia de Testes — Registrar Usuário

## 1. Testes Unitários

### UT-1: ConfirmationToken — isExpired()

- **O que testa:** Regra de verificação de expiração do token com base em `expires_at`
- **Casos cobertos:**
  - Caminho feliz: token com `expires_at` no futuro retorna `false`
  - Token com `expires_at` no passado retorna `true`
  - Token com `expires_at` exatamente igual ao instante atual retorna `true`
- **Mocks necessários:** nenhum — domínio puro
- **Rastreabilidade:** REQ-15 · REQ-16

---

### UT-2: ConfirmationToken — isUsed()

- **O que testa:** Regra de verificação de reuso com base no campo `used_at`
- **Casos cobertos:**
  - Caminho feliz: token com `used_at = null` retorna `false`
  - Token com `used_at` preenchido retorna `true`
- **Mocks necessários:** nenhum — domínio puro
- **Rastreabilidade:** REQ-14 · REQ-17 · REQ-18

---

### UT-3: RegisterUserUseCase — execute()

- **O que testa:** Orquestração do fluxo de registro com todas as suas ramificações, incluindo verificação de unicidade de username
- **Casos cobertos:**
  - Caminho feliz com avatar: username inédito, email inédito, `avatarKey` preenchido com object key do MinIO (`avatars/<uuid>.<ext>`) → `UserRepository.findByUsername` chamado primeiro → hash de senha gerado → usuário criado com status `pending`, `username` e `avatarKey` persistidos → token gerado e persistido → email enviado → log emitido
  - Caminho feliz sem avatar: `avatarKey = null` → usuário criado com `avatar_key = null` no banco
  - Username já cadastrado: `UserRepository.findByUsername` retorna usuário existente → erro com código 409 com mensagem "Este username ja esta cadastrado. Escolha outro." → nenhum registro criado; `UserRepository.findByEmail` não é chamado
  - Email já cadastrado: `UserRepository.findByUsername` retorna `null` (username inédito) → `UserRepository.findByEmail` retorna usuário existente → erro com código 409 → nenhum registro criado
  - Falha no envio de email: `EmailService.send` lança exceção → falha logada em JSON com campos timestamp, requestId, email mascarado, tipoEvento e motivoFalha → conta permanece `pending`, token permanece válido
- **Mocks necessários:** `UserRepository`, `PasswordHasher`, `TokenGenerator`, `EmailService`, `ConfirmationTokenRepository`
- **Rastreabilidade:** REQ-3 · REQ-4 · REQ-5 · REQ-7 · REQ-8 · REQ-11 · NFR-4 · NFR-12

---

### UT-4: ConfirmAccountUseCase — execute()

- **O que testa:** Orquestração do fluxo de confirmação de conta com todas as ramificações
- **Casos cobertos:**
  - Caminho feliz: token válido, não expirado, não usado → `used_at` atualizado → status alterado para `active` → log emitido com timestamp, resultado=`sucesso`, tokenId e requestId
  - Token não encontrado: `ConfirmationTokenRepository.findByToken` retorna `null` → sinal para redirect `/confirm?error=not_found`
  - Token já utilizado: `used_at` não nulo → log emitido → sinal para redirect `/confirm?error=already_confirmed` → status da conta não alterado
  - Token expirado: `expires_at < agora` → `UserRepository.delete` chamado → log emitido → sinal para redirect `/confirm?error=expired`
- **Mocks necessários:** `UserRepository`, `ConfirmationTokenRepository`
- **Rastreabilidade:** REQ-12 · REQ-13 · REQ-14 · REQ-15 · REQ-17 · REQ-18 · NFR-5 · NFR-13

---

### UT-5: CryptoTokenGenerator — generate()

- **O que testa:** Geração de tokens com entropia mínima de 128 bits e unicidade entre chamadas
- **Casos cobertos:**
  - Caminho feliz: token gerado tem 32 caracteres hexadecimais (16 bytes = 128 bits)
  - Duas chamadas consecutivas retornam valores distintos
- **Mocks necessários:** nenhum — adapter de infraestrutura testado diretamente
- **Rastreabilidade:** NFR-5

---

### UT-6: Argon2PasswordHasher — hash()

- **O que testa:** Geração de hash argon2id diferente do texto original e verificabilidade
- **Casos cobertos:**
  - Caminho feliz: hash gerado é diferente da senha em texto simples
  - Hash da mesma senha é verificável (`verify` retorna `true`)
- **Mocks necessários:** nenhum — adapter de infraestrutura testado diretamente
- **Rastreabilidade:** NFR-4

---

### UT-7: MinioAvatarStorageAdapter — save()

- **O que testa:** Upload de arquivo de avatar para o MinIO e retorno da object key
- **Casos cobertos:**
  - Caminho feliz: buffer válido com mimeType `image/jpeg` → SDK MinIO recebe chamada de `putObject` com bucket configurado, object key `avatars/<uuid>.jpg` e content-type correto; retorna object key `avatars/<uuid>.jpg`
  - Caminho feliz com `image/png`: extensão derivada corretamente como `.png`; object key retornada termina em `.png`
  - Caminho feliz com `image/webp`: extensão derivada corretamente como `.webp`; object key retornada termina em `.webp`
  - Dois saves consecutivos geram object keys distintas (UUID único por chamada)
  - Falha de conexão com MinIO (ex: `putObject` lança exceção): exceção propagada ao chamador
- **Mocks necessários:** SDK MinIO (`putObject` mockado para testar sem instância real)
- **Rastreabilidade:** REQ-2 · DT-6

---

### UT-8: RateLimiter — check()

- **O que testa:** Contagem de tentativas por IP e bloqueio após 3 tentativas em janela de 15 minutos
- **Casos cobertos:**
  - Caminho feliz: primeira, segunda e terceira tentativas do mesmo IP são permitidas
  - Quarta tentativa do mesmo IP dentro de 15 minutos retorna bloqueio (HTTP 429)
  - Tentativa após expiração da janela de 15 minutos é permitida (contador resetado)
  - IPs distintos não compartilham contadores
- **Mocks necessários:** relógio — substituição de `Date.now()` para controlar a janela de 15 minutos
- **Rastreabilidade:** NFR-7

---

### UT-9: HomePage — acessibilidade WCAG 2.1 AA

- **O que testa:** Conformidade da página inicial com WCAG 2.1 nível AA usando jest-axe; presença do link de navegação acessível para `/register`
- **Casos cobertos:**
  - Renderização da página não gera violações axe reportadas (ausência de erros de contraste, ausência de elementos sem label, estrutura de headings válida)
  - Link de registro presente no DOM com texto acessível (não vazio, não genérico)
  - Link de registro navegável por teclado (`href` aponta para `/register`)
- **Mocks necessários:** nenhum — componente React Server Component renderizado em ambiente de teste
- **Rastreabilidade:** REQ-1 · REQ-2 · NFR-11 · DT-8

---

### UT-10: RegisterPage — acessibilidade WCAG 2.1 AA e campos do formulário

- **O que testa:** Conformidade do formulário de cadastro com WCAG 2.1 nível AA usando jest-axe; presença e associação correta de todos os campos exigidos pelo REQ-2, incluindo o campo username
- **Casos cobertos:**
  - Renderização do formulário não gera violações axe reportadas
  - Campos nome, username, email, senha, confirmação de senha, data de nascimento e foto de perfil presentes no DOM com labels associados corretamente (`htmlFor` / `aria-label`)
  - Campos de senha com `type="password"` (não expõem o valor ao leitor de tela como texto)
  - Mensagens de erro de validação acessíveis via `aria-live` ou `role="alert"` quando exibidas — incluindo mensagem de username duplicado e username em branco
- **Mocks necessários:** nenhum — componente React renderizado em ambiente de teste (jsdom)
- **Rastreabilidade:** REQ-2 · REQ-6 · REQ-7 · NFR-11 · DT-8

---

### UT-11: AvatarAccessHandler — lógica de autenticação e controle de acesso

- **O que testa:** Decisão de rejeição (401/403) e geração de log estruturado JSON antes do redirect para presigned URL
- **Casos cobertos:**
  - Caminho feliz: sessão válida, proprietário com status `active` e `avatar_key` preenchido → `AvatarAccessPort.getPresignedUrl` chamado → resposta HTTP 302 com URL gerada
  - Requisição sem sessão: `getServerSession` retorna `null` → log JSON emitido com `{ timestamp, userId: null, ownerUserId, tipoRejeicao: 401, requestId }` → HTTP 401
  - Sessão presente mas proprietário com status `inactive`: log JSON emitido com `{ timestamp, userId, ownerUserId, tipoRejeicao: 403, requestId }` → HTTP 403
  - Sessão presente mas proprietário com status `blocked`: log JSON emitido com `{ timestamp, userId, ownerUserId, tipoRejeicao: 403, requestId }` → HTTP 403
  - Proprietário não encontrado no banco: HTTP 404 sem log de rejeição de segurança
  - Proprietário encontrado mas `avatar_key = null`: HTTP 404 sem log de rejeição de segurança
- **Mocks necessários:** `getServerSession` (next-auth), `UserRepository`, `AvatarAccessPort`, logger
- **Rastreabilidade:** NFR-8 · REQ-2

---

## 2. Testes de Integração

### IT-1: DrizzleUserRepository — create(), findByEmail() e findByUsername()

- **O que testa:** Persistência de um novo usuário e recuperação por email e por username no banco de teste; unicidade de username garantida pelo índice UNIQUE
- **Dependências reais usadas:** banco MySQL de teste
- **Casos cobertos:**
  - Caminho feliz com avatar: usuário criado com `username`, `avatar_key = 'avatars/<uuid>.webp'`; `findByEmail` retorna o registro com a object key correta; `findByUsername` retorna o mesmo registro pelo campo username
  - Caminho feliz sem avatar: usuário criado com `avatar_key = null`; `findByUsername` retorna `avatar_key` como `null`
  - Username duplicado: segunda chamada `create` com o mesmo username lança erro de constraint UNIQUE
  - Email duplicado: segunda chamada `create` com o mesmo email lança erro de constraint UNIQUE
  - `findByUsername` com username inexistente: retorna `null`
- **Setup necessário:** banco de teste limpo; migration aplicada
- **Rastreabilidade:** REQ-3 · REQ-7 · REQ-8 · NFR-6

---

### IT-2: DrizzleUserRepository — activate() e delete()

- **O que testa:** Atualização de status para `active` e remoção de registro do banco de teste
- **Dependências reais usadas:** banco MySQL de teste
- **Casos cobertos:**
  - `activate`: usuário com status `pending` tem status atualizado para `active` no banco
  - `delete`: usuário removido não é mais encontrado por `findById`
- **Setup necessário:** usuário `pending` pré-inserido no banco de teste
- **Rastreabilidade:** REQ-12 · REQ-15

---

### IT-3: DrizzleConfirmationTokenRepository — create(), findByToken() e markAsUsed()

- **O que testa:** Persistência, consulta e invalidação de tokens de confirmação no banco de teste
- **Dependências reais usadas:** banco MySQL de teste
- **Casos cobertos:**
  - `create`: token persistido com `expires_at` correto (criação + 24h) e `used_at = null`
  - `findByToken`: token recuperado pelo valor; retorna `null` para token inexistente
  - `markAsUsed`: `used_at` atualizado para o instante atual; chamada subsequente a `findByToken` retorna token com `used_at` preenchido
- **Setup necessário:** usuário pré-inserido (chave estrangeira); banco de teste limpo
- **Rastreabilidade:** REQ-4 · REQ-14 · REQ-17 · REQ-18 · NFR-5

---

### IT-4: MailhogEmailAdapter — send()

- **O que testa:** Envio de email transacional via SMTP ao Mailhog em ambiente de desenvolvimento
- **Dependências reais usadas:** Mailhog (SMTP de teste)
- **Casos cobertos:**
  - Caminho feliz: email enviado com destinatário, assunto e link de confirmação corretos; mensagem aparece na API do Mailhog
  - Falha de conexão SMTP: adapter lança exceção que pode ser capturada pelo chamador
- **Setup necessário:** Mailhog rodando via Docker Compose; caixa limpa antes do teste
- **Rastreabilidade:** REQ-4 · NFR-3 · NFR-12

---

### IT-5: MinioAvatarStorageAdapter — save() com MinIO real

- **O que testa:** Upload efetivo do buffer para o bucket MinIO de teste e retorno da object key correta
- **Dependências reais usadas:** MinIO de teste (via Docker Compose)
- **Casos cobertos:**
  - Caminho feliz: buffer JPEG enviado ao MinIO; objeto existe no bucket com a object key retornada; key tem formato `avatars/<uuid>.jpg`
  - Upload de PNG e WebP: extensão derivada corretamente para cada mimeType; object key termina na extensão correspondente
  - Bucket inexistente: adapter lança exceção descritiva ao chamador (configuração incorreta de ambiente)
  - Cleanup: objeto removido do bucket após o teste para não poluir o MinIO de teste
- **Setup necessário:** MinIO rodando via Docker Compose; bucket de teste criado; credenciais configuradas nas variáveis de ambiente de teste
- **Rastreabilidade:** REQ-2 · DT-6

---

### IT-6: RegisterUserHandler — POST /api/auth/register

- **O que testa:** Validação de entrada no adapter HTTP incluindo unicidade de username; propagação correta para o caso de uso com dependências reais; inclui validação de upload de arquivo de avatar e armazenamento no MinIO
- **Dependências reais usadas:** banco MySQL de teste, Mailhog, MinIO de teste
- **Casos cobertos:**
  - Dados válidos sem avatar: HTTP 200 com mensagem de link enviado; usuário `pending` criado com `avatar_key = null`; username armazenado no banco
  - Dados válidos com avatar JPEG válido (≤ 2 MB): HTTP 200; usuário `pending` criado com `avatar_key` preenchido com object key no formato `avatars/<uuid>.jpg`; objeto gravado no bucket MinIO de teste
  - Avatar com tipo MIME não permitido (ex: `image/gif`): HTTP 400; nenhum registro criado; nenhum objeto gravado no MinIO
  - Avatar com tamanho acima de 2 MB: HTTP 400; nenhum registro criado; nenhum objeto gravado no MinIO
  - Campo username ausente (em branco): HTTP 400 com mensagem "O campo username e obrigatorio."; nenhum registro criado
  - Username já cadastrado: HTTP 409 com mensagem "Este username ja esta cadastrado. Escolha outro."; nenhum registro criado
  - Campo obrigatório ausente (nome, email, data de nascimento): HTTP 400 com mensagem específica; nenhum registro criado
  - Email com formato inválido: HTTP 400; nenhum registro criado
  - Senha fora da política: HTTP 400; nenhum registro criado
  - Senhas divergentes: HTTP 400; nenhum registro criado
  - Email já cadastrado: HTTP 409 com mensagem específica; nenhum registro criado
  - Quarta tentativa do mesmo IP em 15 min: HTTP 429; nenhum registro criado
- **Setup necessário:** banco de teste limpo; Mailhog disponível; MinIO disponível com bucket de teste criado; `RateLimiter` resetado entre casos; cleanup dos objetos de avatar no MinIO após os testes; usuário com username duplicado pré-inserido para o caso de username já cadastrado
- **Rastreabilidade:** REQ-3 · REQ-5 · REQ-6 · REQ-7 · REQ-8 · REQ-9 · REQ-10 · REQ-11 · NFR-6 · NFR-7

---

### IT-7: ConfirmAccountHandler — GET /api/auth/confirm

- **O que testa:** Extração do token da query string, validação e ativação da conta com dependências reais
- **Dependências reais usadas:** banco MySQL de teste
- **Casos cobertos:**
  - Token válido: HTTP 302 Redirect para `/confirm?status=success`; status do usuário alterado para `active`; `used_at` preenchido no token
  - Token ausente na query string: HTTP 302 Redirect para `/confirm?error=invalid_token`
  - Token inexistente no banco: HTTP 302 Redirect para `/confirm?error=not_found`
  - Token já utilizado: HTTP 302 Redirect para `/confirm?error=already_confirmed`; status da conta não alterado
  - Token expirado: HTTP 302 Redirect para `/confirm?error=expired`; cadastro pendente removido do banco
- **Setup necessário:** usuário `pending` e token pré-inseridos no banco; `expires_at` manipulado para simular expiração
- **Rastreabilidade:** REQ-12 · REQ-13 · REQ-14 · REQ-15 · REQ-16 · REQ-17 · REQ-18

---

### IT-8: AvatarAccessHandler — GET /api/users/[userId]/avatar

- **O que testa:** Verificação de autenticação, controle de acesso por status de conta, geração de log estruturado e redirect para presigned URL com dependências reais
- **Dependências reais usadas:** banco MySQL de teste, MinIO de teste (para geração de presigned URL real)
- **Casos cobertos:**
  - Sessão ausente (usuário não autenticado): HTTP 401; log JSON emitido com `{ timestamp, userId: null, ownerUserId, tipoRejeicao: 401, requestId }`; nenhuma presigned URL gerada
  - Sessão válida, proprietário com status `active` e `avatar_key` preenchido: HTTP 302 Redirect para presigned URL temporária do MinIO (URL contém o endpoint MinIO e a object key)
  - Sessão válida, proprietário com status `inactive`: HTTP 403; log JSON emitido com `{ timestamp, userId, ownerUserId, tipoRejeicao: 403, requestId }`; nenhuma presigned URL gerada
  - Sessão válida, proprietário com status `blocked`: HTTP 403; log JSON emitido com `{ timestamp, userId, ownerUserId, tipoRejeicao: 403, requestId }`; nenhuma presigned URL gerada
  - Sessão válida, userId inexistente no banco: HTTP 404; nenhum log de rejeição de segurança
  - Sessão válida, proprietário com `avatar_key = null`: HTTP 404; nenhum log de rejeição de segurança
- **Setup necessário:** usuários com diferentes status pré-inseridos no banco de teste; objeto de avatar pré-carregado no bucket MinIO de teste para o caso do caminho feliz; sessão next-auth mockada ou configurada para os casos autenticados
- **Rastreabilidade:** NFR-8 · REQ-2

---

## 3. Testes E2E Gherkin

### GH-1: Scenario "Acessar formulario de cadastro via link na home"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que o visitante esta na pagina inicial` → navegar para `/` e verificar que a página inicial está carregada
  - `When o visitante clica no link de registro` → localizar o link de registro na página e clicar nele
  - `Then o visitante e levado para a pagina de cadastro` → verificar que a URL atual é `/register`
  - `And o sistema exibe um formulario com os campos nome, username, email, senha, confirmacao de senha, data de nascimento e foto de perfil` → verificar presença dos campos: nome, username, email, senha, confirmação de senha, data de nascimento e foto de perfil no DOM da página `/register`
- **Steps reutilizáveis de outros Scenarios:** `Given que o visitante esta na pagina inicial` pode ser base para outros cenários que partem da home; `Then o visitante e levado para a pagina de cadastro` é reutilizável como precondição em GH-2 e GH-3
- **Estado inicial necessário:** banco de teste limpo; página `/` acessível
- **Rastreabilidade:** REQ-1 · REQ-2 · NFR-1 · NFR-11

---

### GH-2: Scenario "Cadastro realizado com dados validos"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que o visitante esta na pagina de cadastro` → navegar para `/register` e verificar que o formulário está visível (incluindo o campo username e o campo de upload de avatar)
  - `When o visitante preenche todos os campos obrigatorios com dados validos (incluindo username unico) e envia o formulario` → preencher nome, username único, email, senha válida, confirmação, data de nascimento via `multipart/form-data`; o campo avatar é opcional — o step pode omiti-lo ou incluir um arquivo de imagem válido; submeter o formulário
  - `Then o visitante ve uma tela informando que um link de confirmacao foi enviado ao seu email` → verificar exibição da mensagem de link enviado
  - `And o sistema envia um email de confirmacao ao endereco informado` → consultar API do Mailhog e verificar presença do email com o link de confirmação
- **Steps reutilizáveis de outros Scenarios:** `Given que o visitante esta na pagina de cadastro` — reutilizado em GH-3
- **Estado inicial necessário:** banco de teste limpo; Mailhog disponível; MinIO disponível com bucket de teste criado (caso o step inclua upload de avatar)
- **Rastreabilidade:** REQ-3 · REQ-4 · REQ-5 · REQ-7 · NFR-3

---

### GH-3: Scenario Outline "Cadastro com dados invalidos no formulario"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given o visitante esta na pagina de cadastro` → navegar para `/register` (reutilizável com GH-2)
  - `When o visitante preenche o formulario com <situacao>` → parametrizado; preencher formulário com cada situação inválida da tabela de Examples — incluindo as situações "username ja associado a uma conta existente" e "username em branco"
  - `And o visitante submete o formulario` → clicar no botão de envio
  - `Then o sistema exibe a mensagem "<mensagem_de_erro>"` → verificar que a mensagem de erro específica está visível na tela — para "username ja associado a uma conta existente" verificar "Este username ja esta cadastrado. Escolha outro."; para "username em branco" verificar "O campo username e obrigatorio."
  - `And nenhum cadastro e criado` → consultar banco de teste e verificar ausência de novo registro
- **Steps reutilizáveis de outros Scenarios:** `Given o visitante esta na pagina de cadastro` — reutilizado de GH-2
- **Estado inicial necessário:** para o caso "username ja associado a uma conta existente", um usuário com esse username deve estar pré-cadastrado no banco; para o caso "email ja associado a uma conta existente", um usuário com esse email deve estar pré-cadastrado; demais casos requerem banco limpo
- **Rastreabilidade:** REQ-6 · REQ-7 · REQ-8 · REQ-9 · REQ-10 · REQ-11 · NFR-6

---

### GH-4: Scenario "Confirmacao de conta via link valido"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que o visitante possui um cadastro com status "pendente" e recebeu o link de confirmacao por email` → inserir usuário `pending` e token válido no banco; extrair o link de confirmação
  - `When o visitante clica no link de confirmacao dentro do prazo de 24 horas` → navegar para `GET /api/auth/confirm?token=<valor>` no Cypress
  - `Then o visitante ve a pagina de confirmacao "/confirm" com mensagem de sucesso informando que a conta foi ativada` → verificar que a URL atual é `/confirm` (ou contém `status=success`) e que a mensagem de sucesso está visível no HTML
  - `And um link para acessar o sistema e apresentado ao visitante na pagina "/confirm"` → verificar presença de link de acesso ao sistema na página `/confirm`
- **Steps reutilizáveis de outros Scenarios:** setup de usuário `pending` e token — base reutilizável para GH-5 e GH-6 com variações no estado do token
- **Estado inicial necessário:** usuário `pending` e token com `expires_at` futuro inseridos no banco de teste
- **Rastreabilidade:** REQ-12 · REQ-13 · REQ-14

---

### GH-5: Scenario "Confirmacao de cadastro com link expirado"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que um visitante possui um cadastro com status "pendente" e cujo link de confirmacao foi gerado ha mais de 24 horas` → inserir usuário `pending` e token com `expires_at = now - 25h`
  - `When o visitante acessa o link de confirmacao expirado` → navegar para `GET /api/auth/confirm?token=<valor expirado>` no Cypress
  - `Then o visitante ve a pagina de confirmacao "/confirm" com mensagem informando que o link expirou e que o cadastro deve ser realizado novamente` → verificar que a URL atual é `/confirm` (ou contém `error=expired`) e que a mensagem de expiração está visível no HTML
  - `And o cadastro pendente associado ao link e removido automaticamente` → consultar banco de teste e verificar ausência do usuário
  - `And a pagina "/confirm" apresenta um link para a pagina de cadastro` → verificar presença de link apontando para `/register` na página `/confirm`
- **Steps reutilizáveis de outros Scenarios:** setup de usuário `pending` reutilizável de GH-4 com `expires_at` ajustado para o passado
- **Estado inicial necessário:** usuário `pending` e token com `expires_at = now - 25h` inseridos diretamente no banco de teste
- **Rastreabilidade:** REQ-15 · REQ-16

---

### GH-6: Scenario "Confirmacao de cadastro com link ja utilizado"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que o visitante possui uma conta ativada apos clicar no link de confirmacao` → inserir usuário `active` e token com `used_at` preenchido no banco de teste
  - `When o visitante tenta acessar o mesmo link de confirmacao novamente` → navegar para `GET /api/auth/confirm?token=<valor já utilizado>` no Cypress
  - `Then o visitante ve a pagina de confirmacao "/confirm" com mensagem informando que o link de confirmacao ja foi utilizado` → verificar que a URL atual é `/confirm` (ou contém `error=already_confirmed`) e que a mensagem de link já utilizado está visível no HTML
  - `And o sistema nao altera o status da conta` → consultar banco de teste e verificar que o status do usuário permanece `active`
- **Steps reutilizáveis de outros Scenarios:** nenhum — estado inicial específico (conta `active`, token com `used_at` preenchido)
- **Estado inicial necessário:** usuário `active` e token com `used_at` preenchido inseridos diretamente no banco de teste
- **Rastreabilidade:** REQ-17 · REQ-18

---

## 4. Testes de Performance

### PT-1: Latência de navegação home → /register

- **O que mede:** Tempo decorrido entre o clique no link de registro na homepage e o carregamento completo da página `/register` para 95% das requisições
- **Threshold:** ≤ 1.000 ms no percentil p95 (NFR-1)
- **Método de medição:** teste de carga com k6 simulando navegação GET `/` seguido de GET `/register`
- **Número de execuções:** 10 usuários virtuais simultâneos por 60 segundos; pelo menos 100 ciclos de navegação
- **Rastreabilidade:** NFR-1

---

### PT-2: Latência de POST /api/auth/register sob carga

- **O que mede:** Latência de ponta a ponta (p95) do endpoint `POST /api/auth/register` com dados válidos, incluindo hash argon2id, persistência no banco (incluindo verificação do índice UNIQUE de username) e envio de email
- **Threshold:** ≤ 3.000 ms no percentil p95 (NFR-2)
- **Método de medição:** teste de carga com k6
- **Número de execuções:** 10 usuários virtuais simultâneos por 60 segundos; pelo menos 100 requisições com dados válidos (usernames únicos por requisição)
- **Rastreabilidade:** NFR-2 · NFR-6

---

### PT-3: Tempo de hashing argon2id em benchmark isolado

- **O que mede:** Tempo de execução de `Argon2PasswordHasher.hash()` com os parâmetros de produção (64 MB, 3 iterações, paralelismo 2)
- **Threshold:** ≤ 1.000 ms por operação (budget dentro do SLA de 3 s de NFR-2, deixando margem para persistência e envio de email)
- **Método de medição:** benchmark local com Jest usando `performance.now()`
- **Número de execuções:** 10 execuções consecutivas; relatar média e valor máximo
- **Rastreabilidade:** NFR-2 · NFR-4

---

### PT-4: Verificação de unicidade de username com índice UNIQUE sob carga

- **O que mede:** Tempo de execução de `DrizzleUserRepository.findByUsername()` com o índice UNIQUE ativo, simulando verificações concorrentes de unicidade durante registros simultâneos
- **Threshold:** ≤ 50 ms no percentil p95 por consulta isolada (budget suficiente para não comprometer NFR-2)
- **Método de medição:** teste de carga com k6 executando chamadas diretas ao endpoint `POST /api/auth/register` com usernames únicos distintos por VU, coletando latência da query de unicidade via tracing (OpenTelemetry/Jaeger) ou medição no banco de teste com `EXPLAIN ANALYZE`
- **Número de execuções:** 50 usuários virtuais simultâneos por 60 segundos; pelo menos 200 verificações de unicidade
- **Rastreabilidade:** NFR-6 · DT-10

---

### PT-5: Suporte a 100 usuários simultâneos no fluxo de cadastro e confirmação

- **O que mede:** Taxa de erros e latência p95 do fluxo completo (cadastro + confirmação) com 100 usuários virtuais simultâneos
- **Threshold:** taxa de erros = 0%; latência p95 ≤ 3.000 ms; sem erros de disponibilidade (NFR-9)
- **Método de medição:** teste de carga com k6 simulando 100 usuários virtuais executando o fluxo completo: POST `/api/auth/register` seguido de GET `/api/auth/confirm?token=<valor>`
- **Número de execuções:** 100 usuários virtuais simultâneos por 60 segundos
- **Rastreabilidade:** NFR-9

---

## 5. Testes de Segurança

### ST-1: Rate limiting — bloqueio após limite de tentativas por IP

- **O que verifica:** O sistema bloqueia com HTTP 429 após 3 tentativas de cadastro do mesmo IP em 15 minutos, sem processar a requisição
- **Vetor de ataque simulado:** flood de registros a partir de um único IP para criar contas em massa ou sobrecarregar o hashing argon2id
- **Casos cobertos:**
  - Três primeiras tentativas do mesmo IP: HTTP 200 ou 4xx (processadas normalmente)
  - Quarta tentativa do mesmo IP dentro de 15 min: HTTP 429 com estrutura `{ codigo, mensagem, requestId, timestamp }`; nenhum processamento adicional realizado
  - Tentativa de IP diferente não é bloqueada
- **Rastreabilidade:** NFR-7 · Risco "acúmulo de cadastros pendentes" (PRD)

---

### ST-2: Prevenção de reuso de token de confirmação

- **O que verifica:** Token de confirmação é invalidado imediatamente após o primeiro uso bem-sucedido e rejeitado em tentativas subsequentes
- **Vetor de ataque simulado:** replay de token — atacante que obtém o link de confirmação tenta reutilizá-lo após a vítima já ter ativado a conta
- **Casos cobertos:**
  - Primeiro uso do token: HTTP 302 Redirect para `/confirm?status=success`; `used_at` preenchido no banco
  - Segundo uso do mesmo token: HTTP 302 Redirect para `/confirm?error=already_confirmed`; status da conta não alterado; nenhum dado sensível exposto na resposta
- **Rastreabilidade:** NFR-5 · REQ-14 · REQ-17 · REQ-18 · Risco "Token de confirmação previsível ou reutilizável" (PRD)

---

### ST-3: Senhas nunca persistidas em texto simples

- **O que verifica:** O banco de dados não armazena nenhuma senha em texto simples — apenas o hash argon2id
- **Vetor de ataque simulado:** acesso direto ao banco de dados; extração do campo `password_hash` e verificação de que não corresponde ao valor original
- **Casos cobertos:**
  - Após criação de usuário: `password_hash` no banco não é igual à senha informada
  - `password_hash` começa com o identificador do algoritmo argon2id (`$argon2id$`)
- **Rastreabilidade:** NFR-4 · Risco "proteção dos dados dos usuários" (PRD)

---

### ST-4: Rejeição de upload de arquivo com tipo MIME não permitido

- **O que verifica:** O sistema rejeita arquivos de avatar cujo tipo MIME não seja `image/jpeg`, `image/png` ou `image/webp`, retornando HTTP 400 sem persistir nenhum dado
- **Vetor de ataque simulado:** upload de arquivo malicioso (ex: script PHP, executável ELF, HTML com XSS) com extensão `.jpg` falsificada — o sistema não deve confiar apenas na extensão; deve validar o tipo MIME declarado pelo cliente
- **Casos cobertos:**
  - Upload com `Content-Type: application/pdf`: HTTP 400; nenhum objeto gravado no MinIO; nenhum registro criado
  - Upload com `Content-Type: text/html`: HTTP 400; nenhum objeto gravado no MinIO; nenhum registro criado
  - Upload com tamanho > 2 MB (qualquer tipo): HTTP 400; nenhum objeto gravado no MinIO; nenhum registro criado
  - Upload com tipo permitido e tamanho ≤ 2 MB: HTTP 200; objeto gravado no MinIO com object key no formato `avatars/<uuid>.<ext>`
- **Rastreabilidade:** REQ-2 · DT-6 · Risco "proteção dos dados dos usuários" (PRD)

---

### ST-5: Entropia mínima dos tokens de confirmação

- **O que verifica:** Tokens gerados têm pelo menos 128 bits de entropia, tornando inviável a adivinhação por força bruta
- **Vetor de ataque simulado:** enumeração de tokens — atacante tenta adivinhar o token de confirmação de uma vítima por força bruta ou geração de valores de baixa entropia
- **Casos cobertos:**
  - Token gerado tem comprimento de 32 caracteres hexadecimais (16 bytes = 128 bits)
  - Amostra de 1.000 tokens gerados não contém duplicatas
  - Tokens não seguem padrão previsível (ex: sequencial, baseado em timestamp)
- **Rastreabilidade:** NFR-5 · Risco "Token de confirmação previsível ou reutilizável" (PRD)

---

### ST-6: Acesso não autenticado e acesso a conta bloqueada ao endpoint de avatar

- **O que verifica:** O endpoint `GET /api/users/[userId]/avatar` rejeita requisições não autenticadas com HTTP 401 e requisições a contas desativadas ou bloqueadas com HTTP 403, registrando todas as rejeições em log estruturado JSON com os campos obrigatórios do NFR-8
- **Vetor de ataque simulado:** acesso direto a avatares de outros usuários sem autenticação (vazamento de fotos de perfil); acesso a avatares de contas banidas ou desativadas por meio de tokens de sessão ainda válidos
- **Casos cobertos:**
  - Requisição sem token de sessão para `GET /api/users/<userId>/avatar`: HTTP 401; log JSON contém `{ timestamp, userId: null, ownerUserId: <userId>, tipoRejeicao: 401, requestId }` — nenhum campo sensível exposto na resposta
  - Requisição com sessão válida para avatar de usuário com status `inactive`: HTTP 403; log JSON contém `{ timestamp, userId: <requisitor>, ownerUserId: <userId>, tipoRejeicao: 403, requestId }` — nenhuma presigned URL gerada
  - Requisição com sessão válida para avatar de usuário com status `blocked`: HTTP 403; log JSON contém `{ timestamp, userId: <requisitor>, ownerUserId: <userId>, tipoRejeicao: 403, requestId }` — nenhuma presigned URL gerada
  - Requisição com sessão válida para avatar de usuário com status `active`: HTTP 302 Redirect para presigned URL — nenhum log de rejeição emitido
- **Rastreabilidade:** NFR-8 · REQ-2 · Risco "proteção dos dados dos usuários" (PRD)

---

### ST-7: Enumeração de usernames — respostas consistentes para username existente vs. inexistente

- **O que verifica:** O sistema não permite que um atacante determine se um username está cadastrado por diferença de tempo de resposta ou mensagem de erro distinta entre "username já cadastrado" e "username inédito com email já cadastrado"
- **Vetor de ataque simulado:** timing attack ou enumeração via API — atacante submete múltiplos registros variando apenas o username para descobrir quais estão em uso
- **Casos cobertos:**
  - Resposta HTTP 409 para username duplicado: mensagem genérica "Este username ja esta cadastrado. Escolha outro." sem revelar dados do usuário existente (ex: email, nome)
  - Tempo de resposta para username duplicado não é significativamente mais rápido que para username inédito (verificação no adapter HTTP): o sistema não retorna antes de verificar ambas as unicidades de forma que o tempo sozinho revele o resultado
  - Nenhum campo do usuário existente (email, nome, status) é incluído na resposta de erro 409
- **Rastreabilidade:** REQ-7 · NFR-6 · DT-10

---

## Resumo de Cobertura

| Requisito | Unitário                   | Integração               | E2E Gherkin | Performance | Segurança       |
|-----------|----------------------------|--------------------------|-------------|-------------|-----------------|
| REQ-1     | UT-9                       | —                        | GH-1        | PT-1        | —               |
| REQ-2     | UT-7, UT-10, UT-11         | IT-5, IT-6, IT-8         | GH-1        | —           | ST-4, ST-6      |
| REQ-3     | UT-3                       | IT-1, IT-6               | GH-2        | —           | —               |
| REQ-4     | UT-3                       | IT-3, IT-4, IT-6         | GH-2        | —           | —               |
| REQ-5     | UT-3                       | IT-6                     | GH-2        | —           | —               |
| REQ-6     | UT-10                      | IT-6                     | GH-3        | —           | —               |
| REQ-7     | UT-3                       | IT-1, IT-6               | GH-2, GH-3  | PT-2, PT-4  | ST-7            |
| REQ-8     | UT-3                       | IT-1, IT-6               | GH-3        | —           | —               |
| REQ-9     | —                          | IT-6                     | GH-3        | —           | —               |
| REQ-10    | —                          | IT-6                     | GH-3        | —           | —               |
| REQ-11    | UT-3                       | IT-6                     | GH-3        | —           | —               |
| REQ-12    | UT-4                       | IT-2, IT-7               | GH-4        | —           | —               |
| REQ-13    | UT-4                       | IT-7                     | GH-4        | —           | —               |
| REQ-14    | UT-2, UT-4                 | IT-3, IT-7               | GH-4        | —           | ST-2            |
| REQ-15    | UT-1, UT-4                 | IT-2, IT-7               | GH-5        | —           | —               |
| REQ-16    | UT-1, UT-4                 | IT-7                     | GH-5        | —           | —               |
| REQ-17    | UT-2, UT-4                 | IT-3, IT-7               | GH-6        | —           | ST-2            |
| REQ-18    | UT-2, UT-4                 | IT-3, IT-7               | GH-6        | —           | ST-2            |
| NFR-1     | —                          | —                        | GH-1        | PT-1        | —               |
| NFR-2     | —                          | —                        | —           | PT-2, PT-3  | —               |
| NFR-3     | —                          | IT-4                     | —           | —           | —               |
| NFR-4     | UT-6                       | —                        | —           | PT-3        | ST-3            |
| NFR-5     | UT-4, UT-5                 | IT-3                     | —           | —           | ST-2, ST-5      |
| NFR-6     | UT-3                       | IT-1, IT-6               | GH-2, GH-3  | PT-2, PT-4  | ST-7            |
| NFR-7     | UT-8                       | IT-6                     | —           | —           | ST-1            |
| NFR-8     | UT-11                      | IT-8                     | —           | —           | ST-6            |
| NFR-9     | —                          | —                        | —           | PT-5        | —               |
| NFR-11    | UT-9, UT-10                | —                        | GH-1        | —           | —               |
| NFR-12    | UT-3                       | IT-4, IT-6               | —           | —           | —               |
| NFR-13    | UT-4                       | IT-7                     | —           | —           | —               |

> **NFR-10** (disponibilidade 99,9% ao mês): não gera teste automatizado — é SLA de infraestrutura monitorado via Prometheus e Grafana, fora do escopo da test suite da feature.

> **NFR-14** (logs entregues ao Grafana Loki por 7 dias): não gera teste automatizado na suite da feature — é verificado por operações de infraestrutura e configuração do pipeline de observabilidade, fora do escopo do test runner.

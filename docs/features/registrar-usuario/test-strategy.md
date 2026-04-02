# Estratégia de Testes — Registrar Usuário

## 1. Testes Unitários

### UT-1: ConfirmationToken — isExpired()

- **O que testa:** Regra de verificação de expiração do token com base em `expires_at`
- **Casos cobertos:**
  - Caminho feliz: token com `expires_at` no futuro retorna `false`
  - Token com `expires_at` no passado retorna `true`
  - Token com `expires_at` exatamente igual ao instante atual retorna `true`
- **Mocks necessários:** nenhum — domínio puro
- **Rastreabilidade:** REQ-12 · REQ-13

---

### UT-2: ConfirmationToken — isUsed()

- **O que testa:** Regra de verificação de reuso com base no campo `used_at`
- **Casos cobertos:**
  - Caminho feliz: token com `used_at = null` retorna `false`
  - Token com `used_at` preenchido retorna `true`
- **Mocks necessários:** nenhum — domínio puro
- **Rastreabilidade:** REQ-14 · REQ-15

---

### UT-3: RegisterUserUseCase — execute()

- **O que testa:** Orquestração do fluxo de registro com todas as suas ramificações
- **Casos cobertos:**
  - Caminho feliz com avatar: email inédito, `avatarUrl` preenchido com caminho relativo → hash de senha gerado → usuário criado com status `pending` e `avatarUrl` persistido → token gerado e persistido → email enviado → log emitido
  - Caminho feliz sem avatar: `avatarUrl = null` → usuário criado com `avatar_url = null` no banco
  - Email já cadastrado: `UserRepository.findByEmail` retorna usuário existente → erro com código 409 → nenhum registro criado
  - Falha no envio de email: `EmailService.send` lança exceção → falha logada em JSON → conta permanece `pending`, token permanece válido
- **Mocks necessários:** `UserRepository`, `PasswordHasher`, `TokenGenerator`, `EmailService`, `ConfirmationTokenRepository`
- **Rastreabilidade:** REQ-1 · REQ-3 · REQ-7 · REQ-8 · REQ-9 · NFR-2 · NFR-6

---

### UT-4: ConfirmAccountUseCase — execute()

- **O que testa:** Orquestração do fluxo de confirmação de conta com todas as ramificações
- **Casos cobertos:**
  - Caminho feliz: token válido, não expirado, não usado → `used_at` atualizado → status alterado para `active` → log emitido
  - Token não encontrado: `ConfirmationTokenRepository.findByToken` retorna `null` → erro HTTP 404
  - Token já utilizado: `used_at` não nulo → erro HTTP 409 → status da conta não alterado
  - Token expirado: `expires_at < agora` → cadastro pendente removido via `UserRepository.delete` → erro HTTP 410 → log emitido
- **Mocks necessários:** `UserRepository`, `ConfirmationTokenRepository`
- **Rastreabilidade:** REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15 · NFR-3 · NFR-7

---

### UT-5: CryptoTokenGenerator — generate()

- **O que testa:** Geração de tokens com entropia mínima de 128 bits e unicidade entre chamadas
- **Casos cobertos:**
  - Caminho feliz: token gerado tem 32 caracteres hexadecimais (16 bytes = 128 bits)
  - Duas chamadas consecutivas retornam valores distintos
- **Mocks necessários:** nenhum — adapter de infraestrutura testado diretamente
- **Rastreabilidade:** NFR-3

---

### UT-6: Argon2PasswordHasher — hash()

- **O que testa:** Geração de hash argon2id diferente do texto original e verificabilidade
- **Casos cobertos:**
  - Caminho feliz: hash gerado é diferente da senha em texto simples
  - Hash da mesma senha é verificável (`verify` retorna `true`)
- **Mocks necessários:** nenhum — adapter de infraestrutura testado diretamente
- **Rastreabilidade:** NFR-2

---

### UT-7: LocalAvatarStorageAdapter — save()

- **O que testa:** Salvamento de arquivo de avatar no filesystem local e retorno do caminho relativo
- **Casos cobertos:**
  - Caminho feliz: buffer válido com mimeType `image/jpeg` é salvo em `public/uploads/avatars/<uuid>.jpg`; retorna caminho relativo `/uploads/avatars/<uuid>.jpg`
  - Caminho feliz com `image/png`: extensão derivada corretamente como `.png`
  - Caminho feliz com `image/webp`: extensão derivada corretamente como `.webp`
  - Dois saves consecutivos geram nomes de arquivo distintos (UUID único por chamada)
  - Falha de escrita no filesystem (ex: permissão negada): exceção propagada ao chamador
- **Mocks necessários:** módulo `fs` do Node.js (para testar falha de escrita sem gravar em disco real)
- **Rastreabilidade:** REQ-1 · DT-6

---

### UT-8: RateLimiter — check()

- **O que testa:** Contagem de tentativas por IP e bloqueio após 3 tentativas em janela de 15 minutos
- **Casos cobertos:**
  - Caminho feliz: primeira, segunda e terceira tentativas do mesmo IP são permitidas
  - Quarta tentativa do mesmo IP dentro de 15 minutos retorna bloqueio (HTTP 429)
  - Tentativa após expiração da janela de 15 minutos é permitida (contador resetado)
  - IPs distintos não compartilham contadores
- **Mocks necessários:** relógio — substituição de `Date.now()` para controlar a janela de 15 minutos
- **Rastreabilidade:** NFR-4

---

## 2. Testes de Integração

### IT-1: DrizzleUserRepository — create() e findByEmail()

- **O que testa:** Persistência de um novo usuário e recuperação por email no banco de teste
- **Dependências reais usadas:** banco MySQL de teste
- **Casos cobertos:**
  - Caminho feliz com avatar: usuário criado com `avatar_url = '/uploads/avatars/<uuid>.webp'`; `findByEmail` retorna o registro com o caminho relativo correto no campo `avatar_url`
  - Caminho feliz sem avatar: usuário criado com `avatar_url = null`; `findByEmail` retorna `avatar_url` como `null`
  - Email duplicado: segunda chamada `create` com o mesmo email lança erro de constraint UNIQUE
- **Setup necessário:** banco de teste limpo; migration aplicada
- **Rastreabilidade:** REQ-1 · REQ-3 · REQ-8

---

### IT-2: DrizzleUserRepository — activate() e delete()

- **O que testa:** Atualização de status para `active` e remoção de registro do banco de teste
- **Dependências reais usadas:** banco MySQL de teste
- **Casos cobertos:**
  - `activate`: usuário com status `pending` tem status atualizado para `active` no banco
  - `delete`: usuário removido não é mais encontrado por `findById`
- **Setup necessário:** usuário `pending` pré-inserido no banco de teste
- **Rastreabilidade:** REQ-10 · REQ-12

---

### IT-3: DrizzleConfirmationTokenRepository — create(), findByToken() e markAsUsed()

- **O que testa:** Persistência, consulta e invalidação de tokens de confirmação no banco de teste
- **Dependências reais usadas:** banco MySQL de teste
- **Casos cobertos:**
  - `create`: token persistido com `expires_at` correto (criação + 24h) e `used_at = null`
  - `findByToken`: token recuperado pelo valor; retorna `null` para token inexistente
  - `markAsUsed`: `used_at` atualizado para o instante atual; chamada subsequente a `findByToken` retorna token com `used_at` preenchido
- **Setup necessário:** usuário pré-inserido (chave estrangeira); banco de teste limpo
- **Rastreabilidade:** REQ-9 · REQ-14 · REQ-15 · NFR-3

---

### IT-4: MailhogEmailAdapter — send()

- **O que testa:** Envio de email transacional via SMTP ao Mailhog em ambiente de desenvolvimento
- **Dependências reais usadas:** Mailhog (SMTP de teste)
- **Casos cobertos:**
  - Caminho feliz: email enviado com destinatário, assunto e link de confirmação corretos; mensagem aparece na API do Mailhog
  - Falha de conexão SMTP: adapter lança exceção que pode ser capturada pelo chamador
- **Setup necessário:** Mailhog rodando via Docker Compose; caixa limpa antes do teste
- **Rastreabilidade:** REQ-9 · NFR-6

---

### IT-5: LocalAvatarStorageAdapter — save() com filesystem real

- **O que testa:** Gravação efetiva do arquivo no diretório `public/uploads/avatars/` e retorno do caminho relativo correto
- **Dependências reais usadas:** filesystem local (diretório temporário de teste)
- **Casos cobertos:**
  - Caminho feliz: buffer JPEG gravado em disco; arquivo existe no caminho retornado; caminho tem formato `/uploads/avatars/<uuid>.jpg`
  - Gravação de PNG e WebP: extensão derivada corretamente para cada mimeType
  - Diretório de destino criado automaticamente se não existir
  - Cleanup: arquivo removido após o teste para não poluir o diretório `public/`
- **Setup necessário:** diretório temporário de teste isolado; permissão de escrita garantida
- **Rastreabilidade:** REQ-1 · DT-6

---

### IT-6: RegisterUserHandler — POST /api/auth/register

- **O que testa:** Validação de entrada no adapter HTTP e propagação correta para o caso de uso com dependências reais; inclui validação de upload de arquivo de avatar
- **Dependências reais usadas:** banco MySQL de teste, Mailhog, filesystem local
- **Casos cobertos:**
  - Dados válidos sem avatar: HTTP 200 com mensagem de link enviado; usuário `pending` criado com `avatar_url = null`
  - Dados válidos com avatar JPEG válido (≤ 2 MB): HTTP 200; usuário `pending` criado com `avatar_url` preenchido com caminho relativo; arquivo gravado em `public/uploads/avatars/`
  - Avatar com tipo MIME não permitido (ex: `image/gif`): HTTP 400; nenhum registro criado; nenhum arquivo gravado
  - Avatar com tamanho acima de 2 MB: HTTP 400; nenhum registro criado; nenhum arquivo gravado
  - Campo obrigatório ausente (nome, email, data de nascimento): HTTP 400 com mensagem específica; nenhum registro criado
  - Email com formato inválido: HTTP 400; nenhum registro criado
  - Senha fora da política: HTTP 400; nenhum registro criado
  - Senhas divergentes: HTTP 400; nenhum registro criado
  - Email já cadastrado: HTTP 409 com mensagem específica; nenhum registro criado
  - Quarta tentativa do mesmo IP em 15 min: HTTP 429; nenhum registro criado
- **Setup necessário:** banco de teste limpo; Mailhog disponível; `RateLimiter` resetado entre casos; diretório `public/uploads/avatars/` com permissão de escrita; cleanup dos arquivos de avatar após os testes
- **Rastreabilidade:** REQ-1 · REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7 · REQ-8 · REQ-9 · NFR-4

---

### IT-7: ConfirmAccountHandler — GET /api/auth/confirm

- **O que testa:** Extração do token da query string, validação e ativação da conta com dependências reais
- **Dependências reais usadas:** banco MySQL de teste
- **Casos cobertos:**
  - Token válido: HTTP 200 com mensagem de sucesso e `loginUrl`; status do usuário alterado para `active`; `used_at` preenchido no token
  - Token ausente na query string: HTTP 400
  - Token inexistente no banco: HTTP 404
  - Token já utilizado: HTTP 409; status da conta não alterado
  - Token expirado: HTTP 410; cadastro pendente removido do banco
- **Setup necessário:** usuário `pending` e token pré-inseridos no banco; `expires_at` manipulado para simular expiração
- **Rastreabilidade:** REQ-10 · REQ-11 · REQ-12 · REQ-13 · REQ-14 · REQ-15

---

## 3. Testes E2E Gherkin

### GH-1: Scenario "Cadastro realizado com dados validos"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que o visitante esta na pagina de cadastro` → navegar para `/register` e verificar que o formulário está visível (incluindo o campo de upload de avatar)
  - `When o visitante preenche todos os campos obrigatorios com dados validos e envia o formulario` → preencher nome, email, senha válida, confirmação, data de nascimento via `multipart/form-data`; o campo avatar é opcional — o step pode omiti-lo ou incluir um arquivo de imagem válido; submeter o formulário
  - `Then o visitante ve uma tela informando que um link de confirmacao foi enviado ao seu email` → verificar exibição da mensagem de link enviado
  - `And o sistema envia um email de confirmacao ao endereco informado` → consultar API do Mailhog e verificar presença do email com o link de confirmação
- **Steps reutilizáveis de outros Scenarios:** `Given que o visitante esta na pagina de cadastro` — reutilizado em GH-2
- **Estado inicial necessário:** banco de teste limpo; Mailhog disponível; diretório `public/uploads/avatars/` com permissão de escrita (caso o step inclua upload de avatar)
- **Rastreabilidade:** REQ-1 · REQ-8 · REQ-9

---

### GH-2: Scenario Outline "Cadastro com dados invalidos no formulario"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given o visitante esta na pagina de cadastro` → navegar para `/register` (reutilizável com GH-1)
  - `When o visitante preenche o formulario com <situacao>` → parametrizado; preencher formulário com cada situação inválida da tabela de Examples
  - `And o visitante submete o formulario` → clicar no botão de envio
  - `Then o sistema exibe a mensagem "<mensagem_de_erro>"` → verificar que a mensagem de erro específica está visível na tela
  - `And nenhum cadastro e criado` → consultar banco de teste e verificar ausência de novo registro
- **Steps reutilizáveis de outros Scenarios:** `Given o visitante esta na pagina de cadastro` — reutilizado de GH-1
- **Estado inicial necessário:** para o caso "email já associado a uma conta existente", um usuário com esse email deve estar pré-cadastrado no banco; demais casos requerem banco limpo
- **Rastreabilidade:** REQ-2 · REQ-3 · REQ-4 · REQ-5 · REQ-6 · REQ-7

---

### GH-3: Scenario "Confirmacao de conta via link valido"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que o visitante possui um cadastro com status "pendente" e recebeu o link de confirmacao por email` → inserir usuário `pending` e token válido no banco; extrair o link de confirmação
  - `When o visitante clica no link de confirmacao dentro do prazo de 24 horas` → acessar `GET /api/auth/confirm?token=<valor>`
  - `Then o sistema exibe uma mensagem de sucesso informando que a conta foi ativada` → verificar HTTP 200 com mensagem de ativação
  - `And um link para acessar o sistema e apresentado ao visitante` → verificar presença de `loginUrl` na resposta
- **Steps reutilizáveis de outros Scenarios:** setup de usuário `pending` e token — base reutilizável para GH-4 e GH-5 com variações no estado do token
- **Estado inicial necessário:** usuário `pending` e token com `expires_at` futuro inseridos no banco de teste
- **Rastreabilidade:** REQ-10 · REQ-11

---

### GH-4: Scenario "Confirmacao de cadastro com link expirado"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que um visitante possui um cadastro com status "pendente" e cujo link de confirmacao foi gerado ha mais de 24 horas` → inserir usuário `pending` e token com `expires_at = now - 25h`
  - `When o visitante acessa o link de confirmacao expirado` → acessar `GET /api/auth/confirm?token=<valor expirado>`
  - `Then o sistema exibe mensagem informando que o link expirou e que o cadastro deve ser realizado novamente` → verificar HTTP 410 com mensagem de link expirado
  - `And o cadastro pendente associado ao link e removido automaticamente` → consultar banco de teste e verificar ausência do usuário
  - `And o visitante e redirecionado para a pagina de cadastro` → verificar presença de `registerUrl` na resposta apontando para `/register`
- **Steps reutilizáveis de outros Scenarios:** setup de usuário `pending` reutilizável de GH-3 com `expires_at` ajustado para o passado
- **Estado inicial necessário:** usuário `pending` e token com `expires_at = now - 25h` inseridos diretamente no banco de teste
- **Rastreabilidade:** REQ-12 · REQ-13

---

### GH-5: Scenario "Confirmacao de cadastro com link ja utilizado"

- **Arquivo:** `docs/features/registrar-usuario/scenarios.feature`
- **Step definitions necessários:**
  - `Given que o visitante possui uma conta ativada apos clicar no link de confirmacao` → inserir usuário `active` e token com `used_at` preenchido no banco de teste
  - `When o visitante tenta acessar o mesmo link de confirmacao novamente` → acessar `GET /api/auth/confirm?token=<valor já utilizado>`
  - `Then o sistema exibe mensagem informando que o link de confirmacao ja foi utilizado` → verificar HTTP 409 com mensagem de link já utilizado
  - `And o sistema nao altera o status da conta` → consultar banco de teste e verificar que o status do usuário permanece `active`
- **Steps reutilizáveis de outros Scenarios:** nenhum — estado inicial específico (conta `active`, token com `used_at` preenchido)
- **Estado inicial necessário:** usuário `active` e token com `used_at` preenchido inseridos diretamente no banco de teste
- **Rastreabilidade:** REQ-14 · REQ-15

---

## 4. Testes de Performance

### PT-1: Latência de POST /api/auth/register sob carga

- **O que mede:** Latência de ponta a ponta (p95) do endpoint `POST /api/auth/register` com dados válidos, incluindo hash argon2id, persistência no banco e envio de email
- **Threshold:** ≤ 3.000 ms no percentil p95 (NFR-1)
- **Método de medição:** teste de carga com k6
- **Número de execuções:** 10 usuários virtuais simultâneos por 60 segundos; pelo menos 100 requisições com dados válidos
- **Rastreabilidade:** NFR-1

---

### PT-2: Tempo de hashing argon2id em benchmark isolado

- **O que mede:** Tempo de execução de `Argon2PasswordHasher.hash()` com os parâmetros de produção (64 MB, 3 iterações, paralelismo 2)
- **Threshold:** ≤ 1.000 ms por operação (budget dentro do SLA de 3 s de NFR-1, deixando margem para persistência e envio de email)
- **Método de medição:** benchmark local com Jest usando `performance.now()`
- **Número de execuções:** 10 execuções consecutivas; relatar média e valor máximo
- **Rastreabilidade:** NFR-1 · NFR-2

---

## 5. Testes de Segurança

### ST-1: Rate limiting — bloqueio após limite de tentativas por IP

- **O que verifica:** O sistema bloqueia com HTTP 429 após 3 tentativas de cadastro do mesmo IP em 15 minutos, sem processar a requisição
- **Vetor de ataque simulado:** flood de registros a partir de um único IP para criar contas em massa ou sobrecarregar o hashing argon2id
- **Casos cobertos:**
  - Três primeiras tentativas do mesmo IP: HTTP 200 ou 4xx (processadas normalmente)
  - Quarta tentativa do mesmo IP dentro de 15 min: HTTP 429 com estrutura `{ codigo, mensagem, requestId, timestamp }`; nenhum processamento adicional realizado
  - Tentativa de IP diferente não é bloqueada
- **Rastreabilidade:** NFR-4 · Risco "acúmulo de cadastros pendentes" (PRD)

---

### ST-2: Prevenção de reuso de token de confirmação

- **O que verifica:** Token de confirmação é invalidado imediatamente após o primeiro uso bem-sucedido e rejeitado em tentativas subsequentes
- **Vetor de ataque simulado:** replay de token — atacante que obtém o link de confirmação tenta reutilizá-lo após a vítima já ter ativado a conta
- **Casos cobertos:**
  - Primeiro uso do token: HTTP 200; `used_at` preenchido no banco
  - Segundo uso do mesmo token: HTTP 409; status da conta não alterado; nenhum dado sensível exposto na resposta
- **Rastreabilidade:** NFR-3 · REQ-14 · REQ-15 · Risco "Token de confirmação previsível ou reutilizável" (PRD)

---

### ST-3: Senhas nunca persistidas em texto simples

- **O que verifica:** O banco de dados não armazena nenhuma senha em texto simples — apenas o hash argon2id
- **Vetor de ataque simulado:** acesso direto ao banco de dados; extração do campo `password_hash` e verificação de que não corresponde ao valor original
- **Casos cobertos:**
  - Após criação de usuário: `password_hash` no banco não é igual à senha informada
  - `password_hash` começa com o identificador do algoritmo argon2id (`$argon2id$`)
- **Rastreabilidade:** NFR-2 · Risco "proteção dos dados dos usuários" (PRD)

---

### ST-4: Rejeição de upload de arquivo com tipo MIME não permitido

- **O que verifica:** O sistema rejeita arquivos de avatar cujo tipo MIME não seja `image/jpeg`, `image/png` ou `image/webp`, retornando HTTP 400 sem persistir nenhum dado
- **Vetor de ataque simulado:** upload de arquivo malicioso (ex: script PHP, executável ELF, HTML com XSS) com extensão `.jpg` falsificada — o sistema não deve confiar apenas na extensão; deve validar o tipo MIME declarado pelo cliente
- **Casos cobertos:**
  - Upload com `Content-Type: application/pdf`: HTTP 400; nenhum arquivo gravado em disco; nenhum registro criado
  - Upload com `Content-Type: text/html`: HTTP 400; nenhum arquivo gravado; nenhum registro criado
  - Upload com tamanho > 2 MB (qualquer tipo): HTTP 400; nenhum arquivo gravado; nenhum registro criado
  - Upload com tipo permitido e tamanho ≤ 2 MB: HTTP 200; arquivo gravado com extensão derivada do mimeType
- **Rastreabilidade:** REQ-1 · DT-6 · Risco "proteção dos dados dos usuários" (PRD)

---

### ST-5: Entropia mínima dos tokens de confirmação

- **O que verifica:** Tokens gerados têm pelo menos 128 bits de entropia, tornando inviável a adivinhação por força bruta
- **Vetor de ataque simulado:** enumeração de tokens — atacante tenta adivinhar o token de confirmação de uma vítima por força bruta ou geração de valores de baixa entropia
- **Casos cobertos:**
  - Token gerado tem comprimento de 32 caracteres hexadecimais (16 bytes = 128 bits)
  - Amostra de 1.000 tokens gerados não contém duplicatas
  - Tokens não seguem padrão previsível (ex: sequencial, baseado em timestamp)
- **Rastreabilidade:** NFR-3 · Risco "Token de confirmação previsível ou reutilizável" (PRD)

---

## Resumo de Cobertura

| Requisito | Unitário | Integração | E2E Gherkin | Performance | Segurança |
|-----------|----------|------------|-------------|-------------|-----------|
| REQ-1     | UT-3, UT-7 | IT-1, IT-5, IT-6 | GH-1     | —           | ST-4      |
| REQ-2     | —        | IT-6       | GH-2        | —           | —         |
| REQ-3     | UT-3     | IT-1, IT-6 | GH-2        | —           | —         |
| REQ-4     | —        | IT-6       | GH-2        | —           | —         |
| REQ-5     | —        | IT-6       | GH-2        | —           | —         |
| REQ-6     | —        | IT-6       | GH-2        | —           | —         |
| REQ-7     | UT-3     | IT-6       | GH-2        | —           | —         |
| REQ-8     | UT-3     | IT-1, IT-6 | GH-1        | —           | —         |
| REQ-9     | UT-3     | IT-3, IT-4, IT-6 | GH-1  | —           | —         |
| REQ-10    | UT-4     | IT-2, IT-7 | GH-3        | —           | —         |
| REQ-11    | UT-4     | IT-7       | GH-3        | —           | —         |
| REQ-12    | UT-1, UT-4 | IT-2, IT-7 | GH-4      | —           | —         |
| REQ-13    | UT-1, UT-4 | IT-7     | GH-4        | —           | —         |
| REQ-14    | UT-2, UT-4 | IT-3, IT-7 | GH-5      | —           | ST-2      |
| REQ-15    | UT-2, UT-4 | IT-3, IT-7 | GH-5      | —           | ST-2      |
| NFR-1     | —        | —          | —           | PT-1, PT-2  | —         |
| NFR-2     | UT-6     | —          | —           | PT-2        | ST-3      |
| NFR-3     | UT-4, UT-5 | IT-3     | —           | —           | ST-2, ST-5 |
| NFR-4     | UT-8     | IT-6       | —           | —           | ST-1      |
| NFR-5     | —        | —          | —           | —           | —         |
| NFR-6     | UT-3     | IT-4       | —           | —           | —         |
| NFR-7     | UT-4     | IT-7       | —           | —           | —         |

> **NFR-5** (disponibilidade 99,9% ao mês): não gera teste automatizado — é SLA de infraestrutura
> monitorado via Prometheus e Grafana, fora do escopo da test suite da feature.

# Estratégia de Testes — Recuperação de Senha

## 1. Testes Unitários

### UT-1: PasswordResetToken.isExpired()

- **O que testa:** retorna `true` quando `expires_at <= now`, `false` quando ainda dentro do prazo
- **Casos cobertos:**
    - Caminho feliz: token com `expires_at` no futuro retorna `false`
    - Token expirado: `expires_at` no passado retorna `true`
    - Caso de borda: `expires_at` exatamente igual a `now` retorna `true`
- **Mocks necessários:** nenhum — entidade pura
- **Rastreabilidade:** REQ-4 · REQ-12

---

### UT-2: PasswordResetToken.isUsed()

- **O que testa:** retorna `true` quando `used_at` não é `null`, `false` quando ainda não utilizado
- **Casos cobertos:**
    - Caminho feliz: `used_at = null` retorna `false`
    - Token já utilizado: `used_at` preenchido retorna `true`
- **Mocks necessários:** nenhum — entidade pura
- **Rastreabilidade:** REQ-6 · NFR-4

---

### UT-3: PasswordResetToken.compareHash()

- **O que testa:** verifica se o hash SHA-256 do token em texto plano fornecido corresponde ao `token_hash` armazenado
- **Casos cobertos:**
    - Caminho feliz: token correto retorna `true`
    - Token incorreto: retorna `false`
    - Token vazio/nulo: retorna `false`
- **Mocks necessários:** nenhum — entidade pura
- **Rastreabilidade:** NFR-3 · REQ-13

---

### UT-4: RequestPasswordResetUseCase.execute() — email de conta ativa

- **O que testa:** gera token com expiração de 12h, persiste hash e solicita envio de email
- **Casos cobertos:**
    - Caminho feliz: email existente e conta ativa — gera token, persiste hash, chama `IEmailService.sendPasswordReset`
    - `expires_at` calculado como `now + 12h`
- **Mocks necessários:** `IUserRepository`, `IPasswordResetTokenRepository`, `IEmailService`
- **Rastreabilidade:** REQ-4 · REQ-5

---

### UT-5: RequestPasswordResetUseCase.execute() — email inexistente (anti-enumeração)

- **O que testa:** quando email não está cadastrado, não gera token, não envia email, e executa o mesmo caminho de resposta
- **Casos cobertos:**
    - Email não encontrado: `IUserRepository.findByEmail` retorna `null` — nenhuma chamada a `IPasswordResetTokenRepository` ou `IEmailService`
    - Resposta idêntica ao caminho feliz (sem distinção observável externamente)
- **Mocks necessários:** `IUserRepository` (retorna null), `IPasswordResetTokenRepository`, `IEmailService`
- **Rastreabilidade:** REQ-2 · REQ-14

---

### UT-6: ValidateResetTokenUseCase.execute() — token válido

- **O que testa:** token encontrado, `used_at IS NULL` e `expires_at > now` retorna estado válido
- **Casos cobertos:**
    - Caminho feliz: token válido retorna `{ valid: true }`
- **Mocks necessários:** `IPasswordResetTokenRepository`
- **Rastreabilidade:** REQ-7 · REQ-13

---

### UT-7: ValidateResetTokenUseCase.execute() — token expirado

- **O que testa:** token encontrado mas `expires_at <= now` retorna estado expirado
- **Casos cobertos:**
    - Token expirado: retorna erro com código `TOKEN_EXPIRED`
- **Mocks necessários:** `IPasswordResetTokenRepository`
- **Rastreabilidade:** REQ-12

---

### UT-8: ValidateResetTokenUseCase.execute() — token não encontrado

- **O que testa:** `token_hash` não existe no repositório retorna estado inválido
- **Casos cobertos:**
    - Hash não encontrado: retorna erro com código `TOKEN_INVALID`
- **Mocks necessários:** `IPasswordResetTokenRepository`
- **Rastreabilidade:** REQ-13

---

### UT-9: ResetPasswordUseCase.execute() — redefinição bem-sucedida

- **O que testa:** token válido + senha forte — atualiza senha, invalida token e invalida todas as sessões
- **Casos cobertos:**
    - Caminho feliz: chama `IUserRepository.updatePassword`, `IUserRepository.invalidateAllSessions`, `IPasswordResetTokenRepository.markAsUsed`
- **Mocks necessários:** `IPasswordResetTokenRepository`, `IUserRepository`
- **Rastreabilidade:** REQ-6 · REQ-10

---

### UT-10: ResetPasswordUseCase.execute() — senha fraca

- **O que testa:** quando nova senha não atende critérios de força, rejeita sem alterar nada
- **Casos cobertos:**
    - Senha sem caractere especial: retorna erro `WEAK_PASSWORD`
    - Senha curta (abaixo do critério mínimo): retorna erro com critérios não atendidos
    - Nenhuma chamada a `updatePassword` ou `invalidateAllSessions`
- **Mocks necessários:** `IPasswordResetTokenRepository`, `IUserRepository`
- **Rastreabilidade:** REQ-8

---

### UT-11: ResetPasswordUseCase.execute() — token já utilizado

- **O que testa:** token com `used_at` preenchido é rejeitado antes de qualquer operação
- **Casos cobertos:**
    - Token já usado: retorna erro `TOKEN_INVALID`, nenhuma chamada a `updatePassword`
- **Mocks necessários:** `IPasswordResetTokenRepository`
- **Rastreabilidade:** REQ-6 · NFR-4

---

### UT-12: ResetPasswordUseCase.execute() — token expirado

- **O que testa:** token expirado é rejeitado antes de qualquer operação
- **Casos cobertos:**
    - Token com `expires_at <= now`: retorna erro `TOKEN_EXPIRED`, nenhuma chamada a `updatePassword`
- **Mocks necessários:** `IPasswordResetTokenRepository`
- **Rastreabilidade:** REQ-12

---

### UT-13: PasswordRecoveryRouteHandler — validação de entrada HTTP

- **O que testa:** o handler rejeita entradas inválidas antes de delegar ao caso de uso — formato de email e coincidência de senhas
- **Casos cobertos:**
    - Email com formato inválido (ex: `"nao-e-email"`): retorna 400 sem invocar `RequestPasswordResetUseCase`
    - Email ausente no body: retorna 400 sem invocar `RequestPasswordResetUseCase`
    - `password !== passwordConfirm`: retorna 400 com `{ code: "PASSWORDS_MISMATCH" }` sem invocar `ResetPasswordUseCase`
- **Mocks necessários:** `RequestPasswordResetUseCase`, `ResetPasswordUseCase`, `IRateLimitService`
- **Rastreabilidade:** REQ-3 · REQ-9

---

## 2. Testes de Integração

### IT-1: PasswordResetTokenRepositoryDrizzle — create()

- **O que testa:** persiste token de recuperação com `user_id`, `token_hash`, `expires_at` no banco
- **Dependências reais usadas:** banco de dados de teste (MySQL/SQLite)
- **Casos cobertos:**
    - Caminho feliz: registro criado com todos os campos corretos; `used_at` é `null`
    - `user_id` inexistente: viola FK e lança erro
- **Setup necessário:** usuário existente na tabela `users`
- **Rastreabilidade:** REQ-4 · NFR-3

---

### IT-2: PasswordResetTokenRepositoryDrizzle — findByHash()

- **O que testa:** busca token pelo hash SHA-256; retorna entidade correta ou `null`
- **Dependências reais usadas:** banco de dados de teste
- **Casos cobertos:**
    - Hash existente: retorna registro correto
    - Hash inexistente: retorna `null`
- **Setup necessário:** token persistido com hash conhecido
- **Rastreabilidade:** REQ-7 · REQ-12 · REQ-13

---

### IT-3: PasswordResetTokenRepositoryDrizzle — markAsUsed()

- **O que testa:** atualiza `used_at` do token para o timestamp atual
- **Dependências reais usadas:** banco de dados de teste
- **Casos cobertos:**
    - Token válido: `used_at` preenchido após chamada
    - Token já marcado: operação é idempotente (não lança erro)
- **Setup necessário:** token existente com `used_at = null`
- **Rastreabilidade:** REQ-6 · NFR-4

---

### IT-4: IUserRepository — findByEmail(), updatePassword(), invalidateAllSessions()

- **O que testa:** os três métodos usados por esta feature no repositório de usuários
- **Dependências reais usadas:** banco de dados de teste
- **Casos cobertos:**
    - `findByEmail`: email existente retorna usuário; email inexistente retorna `null`
    - `updatePassword`: `password_hash` do usuário é atualizado corretamente
    - `invalidateAllSessions`: todos os registros de sessão do usuário são removidos
- **Setup necessário:** usuário existente; sessões ativas pré-criadas para o teste de `invalidateAllSessions`
- **Rastreabilidade:** REQ-10 · REQ-14

---

### IT-5: EmailServiceAdapter — sendPasswordReset()

- **O que testa:** adaptador envia email com link contendo token; não expõe token em logs
- **Dependências reais usadas:** provedor de email mockado (SMTP stub ou Resend em modo sandbox)
- **Casos cobertos:**
    - Caminho feliz: email enviado com link contendo token em texto plano via HTTPS
    - Provedor indisponível: erro capturado e registrado via `AuditLogger` sem propagar ao usuário
- **Setup necessário:** configuração de provedor de email stub via variável de ambiente
- **Rastreabilidade:** REQ-5 · NFR-3

---

### IT-6: RateLimitServiceAdapter — check() e expiração automática

- **O que testa:** contador por IP respeita limite de 5 tentativas; janela de 1 hora expira automaticamente
- **Dependências reais usadas:** nenhuma (in-memory) — teste de comportamento do adapter
- **Casos cobertos:**
    - Primeiras 5 tentativas: `check()` retorna permitido
    - 6ª tentativa no mesmo IP dentro da janela: retorna bloqueado
    - Após 1 hora da primeira tentativa: IP é desbloqueado automaticamente
- **Setup necessário:** instância limpa do adapter a cada teste; controle de clock via mock de `Date.now`
- **Rastreabilidade:** NFR-5 · REQ-16 · REQ-17

---

## 3. Testes E2E Gherkin

### GH-1: Scenario "Solicitar recuperação com email válido"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário está na tela de login` → navegar para `/login` e verificar que a página carregou
    - `When o usuário clica em "Esqueci a senha"` → clicar no link/botão "Esqueci a senha"
    - `Then o sistema exibe um formulário com campo de email` → verificar presença do formulário e campo de email
    - `And o usuário consegue informar seu email e submeter` → preencher email válido e submeter; verificar resposta 200 com mensagem genérica
- **Steps reutilizáveis de outros Scenarios:** nenhum
- **Estado inicial necessário:** usuário cadastrado ativo no banco de dados de teste
- **Rastreabilidade:** REQ-1 · REQ-2

---

### GH-2: Scenario "Receber email com link válido"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que um usuário solicitou recuperação de senha com email válido` → chamar `POST /api/auth/password-reset/request` com email cadastrado; verificar resposta 200
    - `When o sistema processa a solicitação` → aguardar processamento (fire-and-forget)
    - `Then o sistema envia um email contendo um link único de recuperação` → verificar que `EmailServiceAdapter` foi chamado com link contendo token
    - `And o link contém um token com expiração de 12 horas` → verificar que `expires_at` do token no banco é `created_at + 12h`
- **Steps reutilizáveis de outros Scenarios:** `Given que um usuário solicitou recuperação de senha com email válido` é base para GH-3
- **Estado inicial necessário:** usuário ativo no banco; stub de email configurado para capturar envios
- **Rastreabilidade:** REQ-4 · REQ-5

---

### GH-3: Scenario "Redefinir senha com link válido"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário recebeu um link válido de recuperação` → criar token válido no banco (não expirado, não usado)
    - `When o usuário clica no link e acessa a tela de redefinição` → chamar `GET /api/auth/password-reset/validate?token=<token>` e verificar resposta 200 `{ valid: true }`
    - `And o usuário informa uma nova senha válida e sua confirmação` → preparar payload com senha forte e confirmação coincidente
    - `And o usuário submete o formulário` → chamar `POST /api/auth/password-reset/confirm` com token, password, passwordConfirm
    - `Then o sistema valida a força da senha` → verificar que validação foi executada (sem erro 400 de senha fraca)
    - `And o sistema aceita a redefinição` → verificar resposta 200
    - `And o sistema exibe mensagem de sucesso` → verificar `{ message: "Senha redefinida com sucesso" }` na resposta
    - `And o sistema redireciona para tela de login` → verificar header de redirecionamento ou resposta esperada pelo cliente
- **Steps reutilizáveis de outros Scenarios:** `Given que o usuário recebeu um link válido de recuperação` reutilizável em GH-4 e GH-5
- **Estado inicial necessário:** usuário ativo no banco; token válido inserido diretamente no banco com hash correto
- **Rastreabilidade:** REQ-7 · REQ-8 · REQ-10 · REQ-11

---

### GH-4: Scenario "Redefinir senha com senhas não coincidentes"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário acessou a tela de redefinição com um link válido` → criar token válido no banco; chamar `GET /api/auth/password-reset/validate?token=<token>` com sucesso
    - `When o usuário informa uma nova senha em um campo` → preparar campo `password`
    - `And o usuário informa uma confirmação diferente no outro campo` → preparar `passwordConfirm` com valor diferente
    - `And o usuário submete o formulário` → chamar `POST /api/auth/password-reset/confirm`
    - `Then o sistema detecta a inconsistência` → verificar resposta 400
    - `And o sistema exibe mensagem de erro "As senhas não coincidem"` → verificar `{ code: "PASSWORDS_MISMATCH", message: "As senhas não coincidem" }`
    - `And o formulário permanece visível para nova tentativa` → verificar que resposta não redireciona
- **Steps reutilizáveis de outros Scenarios:** `Given que o usuário acessou a tela de redefinição com um link válido` compartilhado com GH-5
- **Estado inicial necessário:** usuário ativo no banco; token válido inserido diretamente no banco
- **Rastreabilidade:** REQ-9

---

### GH-5: Scenario "Redefinir senha com senha fraca"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário acessou a tela de redefinição com um link válido` → reutilizar step de GH-4
    - `When o usuário informa uma senha que não atende aos critérios de força/complexidade` → preparar senha inválida (ex: "12345678" sem letras ou caractere especial)
    - `And o usuário submete o formulário` → chamar `POST /api/auth/password-reset/confirm`
    - `Then o sistema valida a força da senha` → verificar resposta 400
    - `And o sistema exibe mensagem de erro indicando os critérios não atendidos` → verificar `{ code: "WEAK_PASSWORD", message: "<critérios não atendidos>" }`
    - `And o formulário permanece visível para nova tentativa` → verificar que resposta não redireciona
- **Steps reutilizáveis de outros Scenarios:** `Given que o usuário acessou a tela de redefinição com um link válido` compartilhado com GH-4
- **Estado inicial necessário:** token válido no banco; usuário ativo
- **Rastreabilidade:** REQ-8

---

### GH-6: Scenario "Solicitar recuperação com email inexistente"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário está na tela de formulário de recuperação` → navegar para o formulário de recuperação
    - `When o usuário informa um email que não existe no sistema` → preparar email não cadastrado
    - `And o usuário submete o formulário` → chamar `POST /api/auth/password-reset/request`
    - `Then o sistema não revela se o email existe ou não` → verificar que resposta é 200 (não 404)
    - `And o sistema exibe mensagem genérica "Se existe conta com esse email, você receberá um link de recuperação"` → verificar body da resposta
    - `And o sistema oferece um link para a página de cadastro` → verificar presença do link de cadastro na resposta
    - `And nenhum email é enviado` → verificar que `EmailServiceAdapter` não foi chamado
- **Steps reutilizáveis de outros Scenarios:** nenhum
- **Estado inicial necessário:** banco sem o email utilizado no teste; stub de email configurado para capturar chamadas
- **Rastreabilidade:** REQ-2 · REQ-14 · REQ-15

---

### GH-7: Scenario "Acessar link expirado"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário recebeu um link de recuperação` → criar token no banco com `expires_at` no futuro
    - `And mais de 12 horas passaram desde a geração do link` → atualizar `expires_at` do token para o passado diretamente no banco de teste (ou mockar `Date.now`)
    - `When o usuário clica no link expirado` → chamar `GET /api/auth/password-reset/validate?token=<token>`
    - `Then o sistema detecta a expiração do token` → verificar resposta 410
    - `And o sistema exibe mensagem de erro "O link de recuperação expirou"` → verificar `{ code: "TOKEN_EXPIRED", message: "O link de recuperação expirou" }`
    - `And o sistema redireciona para a página de recuperação` → verificar campo de redirecionamento na resposta
    - `And o sistema oferece opção de solicitar um novo link` → verificar presença da opção na resposta
- **Steps reutilizáveis de outros Scenarios:** nenhum
- **Estado inicial necessário:** token inserido no banco com `expires_at` manipulado para o passado; mecanismo: atualização direta via SQL no banco de teste
- **Rastreabilidade:** REQ-12

---

### GH-8: Scenario "Acessar link com token inválido"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário possui uma URL com um token malformado ou inválido` → preparar token malformado (string curta, caracteres inválidos) ou token com formato correto mas não existente no banco
    - `When o usuário tenta acessar a URL` → chamar `GET /api/auth/password-reset/validate?token=<token_invalido>`
    - `Then o sistema valida o formato do token` → verificar que validação básica de formato ocorre
    - `And o sistema rejeita o token inválido` → verificar resposta 400 (malformado) ou 404 (não encontrado)
    - `And o sistema exibe mensagem de erro "O link de recuperação é inválido"` → verificar `{ code: "TOKEN_INVALID", message: "O link de recuperação é inválido" }`
    - `And o sistema redireciona para a página de recuperação` → verificar campo de redirecionamento na resposta
- **Steps reutilizáveis de outros Scenarios:** nenhum
- **Estado inicial necessário:** banco sem o token usado no teste (para caso "não encontrado"); nenhum estado para caso "malformado"
- **Rastreabilidade:** REQ-13

---

### GH-9: Scenario "Exceder limite de tentativas de solicitação"

- **Arquivo:** `docs/features/recuperacao-de-senha/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário já realizou 5 solicitações de recuperação no mesmo IP em menos de 1 hora` → chamar `POST /api/auth/password-reset/request` 5 vezes com mesmo IP simulado
    - `When o usuário tenta realizar uma 6ª solicitação de recuperação` → chamar `POST /api/auth/password-reset/request` pela 6ª vez
    - `Then o sistema detecta o limite de tentativas excedido` → verificar resposta 429
    - `And o sistema exibe mensagem "Muitas tentativas de recuperação. Tente novamente em 1 hora"` → verificar `{ code: "RATE_LIMIT_EXCEEDED", message: "Muitas tentativas de recuperação. Tente novamente em 1 hora" }`
    - `And o sistema bloqueia a tentativa` → verificar que caso de uso não foi invocado
    - `And a solicitação é registrada em logs de segurança` → verificar que `AuditLogger` foi chamado com evento de bloqueio
- **Steps reutilizáveis de outros Scenarios:** nenhum
- **Estado inicial necessário:** instância do `RateLimitServiceAdapter` com estado zerado; IP fixo simulado via header `X-Forwarded-For` nos testes
- **Rastreabilidade:** REQ-16 · NFR-5

---

## 4. Testes de Performance

### PT-1: Latência do endpoint POST /api/auth/password-reset/confirm (p95)

- **O que mede:** tempo de resposta do endpoint de redefinição de senha do recebimento da requisição até retorno da resposta 200, incluindo validação de token, atualização de senha e invalidação de sessões
- **Threshold:** p95 ≤ 500ms
- **Método de medição:** benchmark local via script de carga (ex: `autocannon` ou `k6`) contra servidor em modo de teste com banco real
- **Número de execuções:** 100 requisições sequenciais com tokens únicos pré-criados; medir p95 do conjunto
- **Rastreabilidade:** NFR-2

---

### PT-2: Tempo de disparo do envio de email após solicitação de recuperação (p95)

- **O que mede:** intervalo entre o `RequestPasswordResetUseCase` persistir o token e o `EmailServiceAdapter.sendPasswordReset` ser invocado (fire-and-forget — mede o pipeline interno, não entrega final)
- **Threshold:** disparo do envio em ≤ 5s para 95% dos casos (a entrega final ao destinatário pode levar até 1 minuto conforme NFR-1, mas o disparo do adapter deve ser imediato)
- **Método de medição:** benchmark local com stub de email instrumentado para registrar timestamp de chamada; comparar com timestamp de resposta HTTP
- **Número de execuções:** 50 execuções com emails distintos; medir p95 do intervalo
- **Rastreabilidade:** NFR-1

---

## 5. Testes de Segurança

### ST-1: Prevenção de enumeração de contas via endpoint de solicitação

- **O que verifica:** resposta do endpoint `POST /api/auth/password-reset/request` é idêntica para email cadastrado e email não cadastrado — tempo de resposta, status HTTP e body não permitem distinguir os dois casos
- **Vetor de ataque simulado:** enumeração de contas — atacante envia emails aleatórios para descobrir quais estão cadastrados com base na diferença de resposta ou tempo
- **Casos cobertos:**
    - Email cadastrado: resposta 200 com mensagem genérica
    - Email não cadastrado: resposta 200 com a mesma mensagem genérica
    - Diferença de tempo de resposta entre os dois casos: deve ser imperceptível (< 50ms de diferença no p95)
- **Rastreabilidade:** NFR-3 · Risco PRD "Redefinição de senha de outro usuário"

---

### ST-2: Prevenção de reutilização de token após uso bem-sucedido

- **O que verifica:** token utilizado em uma redefinição bem-sucedida é rejeitado em tentativa subsequente de uso
- **Vetor de ataque simulado:** replay de token — atacante intercepta ou obtém o token e tenta usá-lo novamente após a vítima já ter redefinido a senha
- **Casos cobertos:**
    - Primeiro uso do token: redefinição bem-sucedida, resposta 200
    - Segundo uso do mesmo token: resposta 410 com `{ code: "TOKEN_INVALID" }`
    - Estado no banco: `used_at` preenchido após primeiro uso
- **Rastreabilidade:** NFR-4 · REQ-6 · Risco PRD "Link de recuperação interceptado por terceiros"

---

### ST-3: Rate limiting por IP — prevenção de força bruta no formulário de email

- **O que verifica:** após 5 tentativas do mesmo IP, o endpoint bloqueia requisições subsequentes e registra em log de auditoria
- **Vetor de ataque simulado:** força bruta — atacante automatiza envios ao endpoint de solicitação para esgotar tentativas ou abusar do serviço de email
- **Casos cobertos:**
    - 5 tentativas do mesmo IP: todas retornam 200
    - 6ª tentativa: retorna 429 com `{ code: "RATE_LIMIT_EXCEEDED" }`
    - Log de auditoria: evento de bloqueio registrado com IP e timestamp
    - IP diferente após bloqueio do primeiro: ainda retorna 200 (bloqueio é por IP, não global)
- **Rastreabilidade:** NFR-5 · REQ-16 · Risco PRD "Força bruta no formulário de email"

---

### ST-4: Token não exposto em logs, respostas HTTP ou mensagens de erro

- **O que verifica:** o token em texto plano nunca aparece em logs estruturados, em respostas de erro ou em qualquer output observável pelo lado do servidor
- **Vetor de ataque simulado:** exposição de token via vazamento de logs — atacante com acesso a logs do sistema consegue obter tokens válidos
- **Casos cobertos:**
    - Solicitação com email válido: verificar que logs de auditoria não contêm o token em texto plano
    - Tentativa com token inválido: verificar que a mensagem de erro não ecoa o token recebido
    - Resposta de todos os endpoints: nenhum campo da resposta contém o token completo
- **Rastreabilidade:** NFR-3 · Risco PRD "Token armazenado de forma insegura"

---

### ST-5: Invalidação de todas as sessões ativas após redefinição de senha

- **O que verifica:** sessões abertas antes da redefinição de senha são invalidadas e não podem mais ser usadas após a redefinição
- **Vetor de ataque simulado:** sequestro de sessão — atacante obteve sessão ativa do usuário antes da redefinição e tenta continuar usando após a troca de senha
- **Casos cobertos:**
    - Sessão ativa existente antes da redefinição: após `POST /api/auth/password-reset/confirm` bem-sucedido, token de sessão anterior retorna 401 ao tentar usá-lo
    - Múltiplas sessões ativas: todas invalidadas após redefinição
- **Rastreabilidade:** REQ-10 · Risco PRD "Link de recuperação interceptado por terceiros"

---

## Resumo de Cobertura

| Requisito | Unitário          | Integração        | E2E Gherkin       | Performance | Segurança         |
| --------- | ----------------- | ----------------- | ----------------- | ----------- | ----------------- |
| REQ-1     | —                 | —                 | GH-1              | —           | —                 |
| REQ-2     | UT-5              | —                 | GH-1, GH-6        | —           | —                 |
| REQ-3     | UT-13             | —                 | GH-1              | —           | —                 |
| REQ-4     | UT-4              | IT-1              | GH-2              | —           | —                 |
| REQ-5     | UT-4              | IT-5              | GH-2              | PT-2        | —                 |
| REQ-6     | UT-9, UT-11       | IT-3              | GH-3              | —           | ST-2              |
| REQ-7     | UT-6              | IT-2              | GH-3              | —           | —                 |
| REQ-8     | UT-10             | —                 | GH-3, GH-5        | —           | —                 |
| REQ-9     | UT-13             | —                 | GH-4              | —           | —                 |
| REQ-10    | UT-9              | IT-4              | GH-3              | —           | ST-5              |
| REQ-11    | —                 | —                 | GH-3              | —           | —                 |
| REQ-12    | UT-1, UT-7, UT-12 | IT-2              | GH-7              | —           | —                 |
| REQ-13    | UT-3, UT-8        | IT-2              | GH-8              | —           | —                 |
| REQ-14    | UT-5              | IT-4              | GH-6              | —           | ST-1              |
| REQ-15    | —                 | —                 | GH-6              | —           | —                 |
| REQ-16    | —                 | IT-6              | GH-9              | —           | ST-3              |
| REQ-17    | —                 | IT-6              | —                 | —           | —                 |
| NFR-1     | —                 | —                 | —                 | PT-2        | —                 |
| NFR-2     | —                 | —                 | —                 | PT-1        | —                 |
| NFR-3     | UT-3              | IT-1, IT-5        | —                 | —           | ST-1, ST-4        |
| NFR-4     | UT-2, UT-11       | IT-3              | —                 | —           | ST-2              |
| NFR-5     | —                 | IT-6              | GH-9              | —           | ST-3              |
| NFR-6     | —                 | —                 | GH-9              | —           | ST-3, ST-4        |

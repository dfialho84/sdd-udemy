# Design — Recuperação de Senha

## 1. Visão Geral Técnica

A recuperação de senha é implementada como um fluxo de dois passos via token de uso único: solicitação (geração e envio do token) e redefinição (validação e troca de senha). O token é gerado com expiração de 12 horas, armazenado criptografado (hash) no banco de dados e entregue via link de email. A arquitetura segue o modelo hexagonal definido na `constitution.md` — toda lógica de domínio (geração de token, validação de expiração, força de senha, invalidação de sessões) reside exclusivamente na camada Domain, exposta via Ports. O envio de email e a persistência são adapters de infraestrutura. O controle de rate limiting por IP é aplicado no adapter HTTP inbound antes de qualquer processamento de domínio. Observabilidade é garantida por log estruturado (JSON/OpenTelemetry) em todas as operações que alteram estado.

---

## 2. Arquitetura de Componentes

### PasswordRecoveryRouteHandler
- **Camada:** Adapter HTTP inbound (`app/api/auth/password-reset/route.ts`)
- **Responsabilidade:** Receber requisições HTTP, validar formato dos campos de entrada (email, token, nova senha), aplicar rate limiting por IP via `IRateLimitService`, delegar ao caso de uso correspondente via Port, formatar resposta HTTP e propagar erros estruturados.
- **Dependências:** `RequestPasswordResetUseCase`, `ResetPasswordUseCase`, `ValidateResetTokenUseCase`, `IRateLimitService`

### RequestPasswordResetUseCase
- **Camada:** Domain (caso de uso)
- **Responsabilidade:** Verificar se o email está associado a uma conta ativa; gerar token único com expiração de 12 horas; armazenar o hash do token; solicitar envio do email com link. Se o email não existir, executar o mesmo caminho de resposta sem enviar email (anti-enumeração — REQ-14).
- **Dependências:** `IUserRepository`, `IPasswordResetTokenRepository`, `IEmailService`

### ResetPasswordUseCase
- **Camada:** Domain (caso de uso)
- **Responsabilidade:** Validar token (existência, hash, expiração); validar força/complexidade da nova senha; atualizar hash da senha do usuário; invalidar o token utilizado; invalidar todas as sessões ativas anteriores do usuário (REQ-10).
- **Dependências:** `IPasswordResetTokenRepository`, `IUserRepository`

### ValidateResetTokenUseCase
- **Camada:** Domain (caso de uso)
- **Responsabilidade:** Verificar se um token é válido e não expirado antes de exibir o formulário de redefinição. Retorna estado (válido / expirado / inválido) para o adapter HTTP.
- **Dependências:** `IPasswordResetTokenRepository`

### PasswordResetToken
- **Camada:** Domain (entidade)
- **Responsabilidade:** Encapsular as regras do token: comparar hash, verificar expiração, marcar como utilizado.
- **Dependências:** nenhuma (entidade pura)

### IPasswordResetTokenRepository
- **Camada:** Domain (Port de saída)
- **Responsabilidade:** Contrato de persistência para tokens de recuperação (criar, buscar por hash, invalidar).
- **Dependências:** nenhuma

### IUserRepository
- **Camada:** Domain (Port de saída — já existente na feature login/registrar)
- **Responsabilidade:** Buscar usuário por email; atualizar hash de senha; invalidar sessões ativas.
- **Dependências:** nenhuma

### IEmailService
- **Camada:** Domain (Port de saída)
- **Responsabilidade:** Contrato de envio de email transacional (enviar link de recuperação).
- **Dependências:** nenhuma

### IRateLimitService
- **Camada:** Domain (Port de saída)
- **Responsabilidade:** Contrato para verificar e registrar tentativas por chave (IP), com janela de tempo configurável.
- **Dependências:** nenhuma

### PasswordResetTokenRepositoryDrizzle
- **Camada:** Infraestrutura (adapter de persistência) — NOVO
- **Responsabilidade:** Implementar `IPasswordResetTokenRepository` usando Drizzle ORM.
- **Dependências:** Drizzle, schema `password_reset_tokens`

### EmailServiceAdapter
- **Camada:** Infraestrutura (adapter de serviço externo) — NOVO
- **Responsabilidade:** Implementar `IEmailService` via SMTP ou serviço externo (ex: Nodemailer, Resend).
- **Dependências:** provedor de email configurado via variável de ambiente

### RateLimitServiceAdapter
- **Camada:** Infraestrutura (adapter) — NOVO
- **Responsabilidade:** Implementar `IRateLimitService` com contador por IP e janela deslizante de 1 hora (NFR-5). Implementação atual in-memory com `Map` e TTL (ver DT-2).
- **Dependências:** nenhuma externa (in-memory)

### AuditLogger
- **Camada:** Infraestrutura (adapter de observabilidade — já existente ou a criar)
- **Responsabilidade:** Registrar logs estruturados (JSON) de todas as operações de recuperação: solicitações, bloqueios por rate limit, tentativas com email inexistente, redefinições concluídas (NFR-6).
- **Dependências:** OpenTelemetry/Loki

---

## 3. Modelo de Dados

### Entidade: password_reset_tokens

| Campo      | Tipo         | Descrição                                                                         |
|------------|--------------|-----------------------------------------------------------------------------------|
| id         | UUID         | Identificador único do registro                                                   |
| user_id    | UUID (FK)    | Referência ao usuário dono do token (tabela `users`)                              |
| token_hash | VARCHAR(255) | Hash criptográfico do token (nunca o token em texto plano — NFR-3)                |
| expires_at | TIMESTAMP    | Momento de expiração do token (geração + 12 horas — REQ-4)                       |
| used_at    | TIMESTAMP    | Momento em que o token foi utilizado; NULL se ainda não usado (NFR-4)             |
| created_at | TIMESTAMP    | Momento de criação do registro (auditoria — NFR-6)                                |

**Relações:**
- `password_reset_tokens.user_id` → `users.id` (N:1)

**Regras de negócio implícitas no modelo:**
- Token válido: `used_at IS NULL AND expires_at > NOW()`
- Token expirado: `expires_at <= NOW()` (independentemente de `used_at`)
- Token inválido: `token_hash` não encontrado na tabela

### Campos relevantes de `users` (entidade existente)

| Campo         | Uso nesta feature                                                        |
|---------------|--------------------------------------------------------------------------|
| id            | Chave de relacionamento com `password_reset_tokens`                      |
| email         | Lookup para verificar existência da conta (REQ-14)                       |
| password_hash | Campo atualizado após redefinição bem-sucedida (REQ-10)                  |
| is_active     | Verificação se a conta está ativa antes de gerar token (REQ-4)           |

---

## 4. API / Contratos

### POST /api/auth/password-reset/request

**Autenticação:** nenhuma (endpoint público)

**Request body:**

| Campo | Tipo   | Obrigatório | Descrição         |
|-------|--------|-------------|-------------------|
| email | string | sim         | Endereço de email |

**Response 200:**
```json
{
  "message": "Se existe conta com esse email, você receberá um link de recuperação"
}
```

**Erros:**

| Código | Situação                                        | Referência    |
|--------|-------------------------------------------------|---------------|
| 400    | Formato de email inválido                       | REQ-3         |
| 429    | Limite de 5 tentativas por IP por hora excedido | REQ-16, NFR-5 |

---

### GET /api/auth/password-reset/validate?token={token}

**Autenticação:** nenhuma (endpoint público)

**Query params:**

| Parâmetro | Tipo   | Obrigatório | Descrição                                                   |
|-----------|--------|-------------|-------------------------------------------------------------|
| token     | string | sim         | Token de recuperação (texto plano — comparado ao hash armazenado) |

**Response 200:**
```json
{
  "valid": true
}
```

**Erros:**

| Código | Situação                            | Referência |
|--------|-------------------------------------|------------|
| 400    | Token malformado ou ausente         | REQ-13     |
| 404    | Token não encontrado no sistema     | REQ-13     |
| 410    | Token expirado                      | REQ-12     |

---

### POST /api/auth/password-reset/confirm

**Autenticação:** nenhuma (autenticado pelo token no body)

**Request body:**

| Campo           | Tipo   | Obrigatório | Descrição                          |
|-----------------|--------|-------------|------------------------------------|
| token           | string | sim         | Token de recuperação (texto plano) |
| password        | string | sim         | Nova senha                         |
| passwordConfirm | string | sim         | Confirmação da nova senha          |

**Response 200:**
```json
{
  "message": "Senha redefinida com sucesso"
}
```

**Erros:**

| Código | Situação                                              | Referência |
|--------|-------------------------------------------------------|------------|
| 400    | Senhas não coincidem                                  | REQ-9      |
| 400    | Nova senha não atende critérios de força/complexidade | REQ-8      |
| 400    | Token ausente ou malformado                           | REQ-13     |
| 404    | Token não encontrado                                  | REQ-13     |
| 410    | Token expirado                                        | REQ-12     |

---

**Formato de erro padrão** (todos os endpoints — constitution.md, regra 5):
```json
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Muitas tentativas de recuperação. Tente novamente em 1 hora",
  "requestId": "uuid",
  "timestamp": "2026-04-17T10:00:00Z"
}
```

---

## 5. Fluxo de Execução

### Fluxo: Solicitar recuperação com email válido

1. `PasswordRecoveryRouteHandler` recebe `POST /api/auth/password-reset/request` com `{ email }`.
2. `PasswordRecoveryRouteHandler` valida formato do email — se inválido, retorna 400 (REQ-3).
3. `PasswordRecoveryRouteHandler` consulta `IRateLimitService.check(ip)` — se limite excedido, retorna 429 e registra em log via `AuditLogger` (REQ-16, NFR-5).
4. `PasswordRecoveryRouteHandler` delega a `RequestPasswordResetUseCase.execute({ email })`.
5. `RequestPasswordResetUseCase` consulta `IUserRepository.findByEmail(email)`.
6. Email existe e conta está ativa: `RequestPasswordResetUseCase` gera token único (texto plano) e calcula `expires_at = now + 12h` (REQ-4).
7. `RequestPasswordResetUseCase` calcula `token_hash = hash(token)` e persiste via `IPasswordResetTokenRepository.create({ user_id, token_hash, expires_at })` (NFR-3).
8. `RequestPasswordResetUseCase` solicita envio via `IEmailService.sendPasswordReset({ email, token })`.
9. `AuditLogger` registra a solicitação bem-sucedida com timestamp e IP (NFR-6).
10. `PasswordRecoveryRouteHandler` retorna 200 com mensagem genérica (REQ-2).

### Fluxo: Receber email com link válido

1. `EmailServiceAdapter` envia o email com link `https://<host>/auth/password-reset?token=<token_texto_plano>` usando HTTPS (REQ-5, NFR-3).
2. O link contém o token em texto plano apenas na URL (via HTTPS) — nunca armazenado em log (NFR-3).
3. O link expira em 12 horas a partir da geração (REQ-4).

### Fluxo: Redefinir senha com link válido

1. Cliente envia `GET /api/auth/password-reset/validate?token=<token>`.
2. `PasswordRecoveryRouteHandler` delega a `ValidateResetTokenUseCase.execute({ token })`.
3. `ValidateResetTokenUseCase` calcula `hash(token)` e consulta `IPasswordResetTokenRepository.findByHash(token_hash)`.
4. Token encontrado, `used_at IS NULL` e `expires_at > now`: retorna estado `válido`.
5. `PasswordRecoveryRouteHandler` retorna 200 `{ valid: true }` — cliente exibe formulário de redefinição (REQ-7).
6. Cliente envia `POST /api/auth/password-reset/confirm` com `{ token, password, passwordConfirm }`.
7. `PasswordRecoveryRouteHandler` valida que `password === passwordConfirm` — se divergirem, retorna 400 (REQ-9).
8. `PasswordRecoveryRouteHandler` delega a `ResetPasswordUseCase.execute({ token, password })`.
9. `ResetPasswordUseCase` calcula `hash(token)` e consulta `IPasswordResetTokenRepository.findByHash(token_hash)`.
10. `ResetPasswordUseCase` verifica token válido (não expirado, não usado).
11. `ResetPasswordUseCase` valida força/complexidade da senha — se falhar, retorna 400 com critérios não atendidos (REQ-8).
12. `ResetPasswordUseCase` atualiza `users.password_hash` via `IUserRepository.updatePassword(user_id, new_hash)` (REQ-10).
13. `ResetPasswordUseCase` invalida sessões ativas via `IUserRepository.invalidateAllSessions(user_id)` (REQ-10).
14. `ResetPasswordUseCase` invalida o token via `IPasswordResetTokenRepository.markAsUsed(token_hash)` (REQ-6, NFR-4).
15. `AuditLogger` registra a redefinição bem-sucedida (NFR-6).
16. `PasswordRecoveryRouteHandler` retorna 200 com mensagem de sucesso — cliente redireciona para login (REQ-11).

### Fluxo: Redefinir senha com senhas não coincidentes

1. Cliente envia `POST /api/auth/password-reset/confirm` com `password !== passwordConfirm`.
2. `PasswordRecoveryRouteHandler` detecta divergência antes de delegar ao caso de uso.
3. Retorna 400 com `{ code: "PASSWORDS_MISMATCH", message: "As senhas não coincidem" }` (REQ-9).
4. Formulário permanece visível no cliente para nova tentativa.

### Fluxo: Redefinir senha com senha fraca

1. Cliente envia `POST /api/auth/password-reset/confirm` com senha que não atende critérios.
2. `PasswordRecoveryRouteHandler` delega a `ResetPasswordUseCase.execute({ token, password })`.
3. `ResetPasswordUseCase` valida força da senha — detecta critérios não atendidos.
4. Retorna 400 com `{ code: "WEAK_PASSWORD", message: "<critérios não atendidos>" }` (REQ-8).
5. Formulário permanece visível no cliente para nova tentativa.

### Fluxo: Solicitar recuperação com email inexistente

1. `PasswordRecoveryRouteHandler` recebe `POST /api/auth/password-reset/request` com email inexistente.
2. Rate limit verificado normalmente (REQ-16).
3. `RequestPasswordResetUseCase` consulta `IUserRepository.findByEmail(email)` — não encontrado.
4. `RequestPasswordResetUseCase` NÃO gera token, NÃO envia email (REQ-14).
5. `AuditLogger` registra tentativa com email inexistente (NFR-6).
6. `PasswordRecoveryRouteHandler` retorna 200 com a mesma mensagem genérica (REQ-2, REQ-14) — anti-enumeração.
7. Response inclui link para página de cadastro (REQ-15).

### Fluxo: Acessar link expirado

1. Cliente envia `GET /api/auth/password-reset/validate?token=<token>`.
2. `ValidateResetTokenUseCase` calcula `hash(token)`, consulta repositório — token encontrado mas `expires_at <= now`.
3. `PasswordRecoveryRouteHandler` retorna 410 com `{ code: "TOKEN_EXPIRED", message: "O link de recuperação expirou" }` (REQ-12).
4. Cliente redireciona para página de recuperação e exibe opção de solicitar novo link (REQ-12).

### Fluxo: Acessar link com token inválido

1. Cliente envia `GET /api/auth/password-reset/validate?token=<token_malformado>`.
2. `PasswordRecoveryRouteHandler` valida formato básico do token — se malformado, retorna 400 sem consultar repositório (REQ-13).
3. Se formato válido mas token não existe: `ValidateResetTokenUseCase` não encontra no repositório, retorna 404 (REQ-13).
4. Em ambos os casos: `{ code: "TOKEN_INVALID", message: "O link de recuperação é inválido" }`.
5. Cliente redireciona para página de recuperação (REQ-13).

### Fluxo: Exceder limite de tentativas de solicitação

1. `PasswordRecoveryRouteHandler` recebe `POST /api/auth/password-reset/request` de IP com 5+ tentativas na última hora.
2. `IRateLimitService.check(ip)` retorna bloqueado.
3. `AuditLogger` registra tentativa bloqueada com IP e timestamp (REQ-16, NFR-6).
4. `PasswordRecoveryRouteHandler` retorna 429 com `{ code: "RATE_LIMIT_EXCEEDED", message: "Muitas tentativas de recuperação. Tente novamente em 1 hora" }` (REQ-16).
5. Caso de uso NÃO é invocado.
6. `RateLimitServiceAdapter` libera o IP automaticamente após 1 hora da primeira tentativa do intervalo (REQ-17, NFR-5).

---

## 6. Decisões Técnicas

### DT-1: Algoritmo de hash do token de recuperação

**Problema:** NFR-3 exige que o token seja armazenado de forma criptografada e irreversível. É necessário escolher o algoritmo de hash.

**Alternativas:**
- bcrypt: lento por design (ideal para senhas), mas desnecessariamente custoso para tokens aleatórios e não suporta lookup direto por hash determinístico.
- SHA-256: rápido, determinístico e suficiente — o token em si é longo e aleatório (alta entropia), então a velocidade do hash não representa risco.

**Decisão:** SHA-256 sobre token gerado com `crypto.randomBytes(32)` (256 bits de entropia).

**Justificativa:** O risco de ataque a tokens aleatórios de alta entropia não é mitigado pela lentidão do hash — o gargalo de segurança é a entropia do token, não o custo do hash. SHA-256 permite lookup determinístico eficiente no banco. O trade-off é que bcrypt seria mais seguro contra vazamento de banco, mas a expiração de 12h e o uso único (NFR-4) já limitam a janela de risco.

**Requisito relacionado:** NFR-3, REQ-4

---

### DT-2: Implementação do rate limiting (in-memory vs Redis)

**Problema:** NFR-5 exige limitar a 5 tentativas por IP por hora. A stack do projeto não inclui Redis.

**Alternativas:**
- Redis: persistente entre instâncias, ideal para ambientes com múltiplos pods. Exigiria adicionar Redis à stack.
- In-memory com Map + TTL: simples, sem dependência adicional, suficiente para instância única (ambiente de desenvolvimento e MVP).

**Decisão:** In-memory com `Map<ip, { count, firstAttemptAt }>` e expiração por TTL calculado a partir de `firstAttemptAt`.

**Justificativa:** A stack atual não inclui Redis. Adicionar Redis para rate limiting de MVP representa overhead de infraestrutura desproporcional ao benefício. O trade-off é que em ambiente multi-instância o limite não seria compartilhado entre pods — aceitável para o estágio atual do projeto. A interface `IRateLimitService` permite trocar a implementação por Redis no futuro sem alterar o Domain.

**Requisito relacionado:** NFR-5, REQ-16, REQ-17

---

### DT-3: Envio de email — síncrono vs assíncrono

**Problema:** O envio de email envolve chamada a serviço externo (SMTP/Resend). Bloquear a resposta HTTP até o email ser entregue degrada a experiência e expõe o sistema a timeouts do provedor.

**Alternativas:**
- Síncrono (await): resposta HTTP aguarda confirmação do provedor de email. Simples, mas acopla latência do provedor ao tempo de resposta da API.
- Assíncrono fire-and-forget: a API responde 200 imediatamente após persistir o token; o envio do email ocorre em background.

**Decisão:** Assíncrono fire-and-forget — o `RequestPasswordResetUseCase` persiste o token, dispara o envio sem aguardar e retorna sucesso.

**Justificativa:** NFR-1 permite até 1 minuto para entrega do email em 95% dos casos, o que é incompatível com manter a resposta HTTP bloqueada. O trade-off é que falhas no envio de email não são propagadas ao usuário na mesma requisição — devem ser capturadas e registradas via `AuditLogger` para observabilidade (NFR-6, constitution.md regra 6).

**Requisito relacionado:** NFR-1, REQ-5

---

### DT-4: Invalidação de sessões ativas após redefinição de senha

**Problema:** REQ-10 exige que todas as sessões ativas do usuário sejam invalidadas após a redefinição de senha. O mecanismo depende de como o next-auth gerencia sessões.

**Alternativas:**
- Deletar registros da tabela `sessions` do next-auth por `userId`: efetivo para sessões de banco de dados (strategy `database`).
- Rotacionar o `sessionToken` / usar campo `revokedAt`: mais granular, mas mais complexo.
- Incrementar um campo `passwordVersion` no usuário e validar no middleware: stateless, funciona com JWT sessions, sem deletar registros.

**Decisão:** Deletar todos os registros da tabela `sessions` do next-auth onde `userId = <user_id>` via `IUserRepository.invalidateAllSessions(user_id)`.

**Justificativa:** A stack usa next-auth com Drizzle e MySQL — a strategy `database` é padrão nesta configuração, o que significa que sessões são registros na tabela `sessions`. A deleção direta é a abordagem mais simples e direta. O trade-off é que exige conhecimento da estrutura interna do next-auth no adapter de repositório, mas isso é isolado na camada de infraestrutura (constitution.md, regra 2).

**Requisito relacionado:** REQ-10

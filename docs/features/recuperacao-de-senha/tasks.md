# Tasks — Recuperacao de Senha

## REQ-1 — Exibir formulario de recuperacao

> Quando o usuario aciona a opcao "Esqueci a senha" na tela de login, o sistema deve exibir um formulario com campo para informar o endereco de e-mail.

### T-01: Criar componente de UI da pagina de solicitacao de recuperacao de senha

- [x] Criar pagina em `app/(auth)/esqueci-senha/page.tsx` com formulario contendo campo de email e botao "Enviar link". Utilizar componente Input do design-system para o campo de email e Button `variant="default"` para submissao. Exibir mensagens de erro de validacao inline quando aplicavel. Garantir que o formulario seja exibido ao clicar em "Esqueci a senha" na tela de login.

**Rastreabilidade:** REQ-1
**Depende de:** --
**Concluida quando:** Tela de recuperacao com campo de email e botao de envio e acessivel via rota `/esqueci-senha` e o formulario e renderizado corretamente.

---

### T-02: Criar schema de validacao de formato de email (Zod)

- [x] Criar schema Zod `emailSchema` que valida formato de email seguindo RFC 5322 simplificado. O schema deve rejeitar strings sem `@`, sem dominio, ou com caracteres invalidos. Exportar para uso no route handler e no formulario React.

**Rastreabilidade:** REQ-3
**Depende de:** --
**Concluida quando:** Schema valida emails como `usuario@dominio.com` e rejeita `invalido`, `sem-arroba` e `@sem-nome`.

---

## REQ-2 — Exibir mensagem generica de confirmacao

> Quando o usuario submete o formulario de recuperacao com um endereco de e-mail, o sistema deve exibir a mensagem "Se existe conta com esse email, voce recebera um link de recuperacao".

**Nota:** Tasks deste requisito estao no bloco REQ-4 (RequestPasswordResetUseCase) e REQ-15 (endpoint de solicitacao), por serem o REQ de menor numeracao que os implementa primariamente.

---

## REQ-3 — Validar formato de email

> Se o endereco de e-mail informado no formulario de recuperacao nao estiver em formato valido, o sistema deve rejeitar a submissao e exibir uma mensagem de erro indicando que o formato e invalido.

**Nota:** Tasks deste requisito estao nos blocos REQ-1 (T-02, schema Zod) e REQ-15 (T-18, endpoint validation).

---

## REQ-4 — Gerar token unico com 12h de expiracao

> Quando o e-mail submetido esta associado a uma conta ativa, o sistema deve gerar um token unico de recuperacao com prazo de expiracao de 12 horas a partir do momento da geracao.

### T-03: Criar entidade de dominio PasswordResetToken

- [x] Criar entidade pura `PasswordResetToken` na camada Domain com propriedades: `tokenHash`, `expiresAt`, `usedAt` e `userId`. Implementar metodo `isExpired(): boolean` que retorna `true` quando `expiresAt <= now`. Implementar metodo `isUsed(): boolean` que retorna `true` quando `usedAt` nao e null. Implementar metodo `compareHash(plainToken: string): boolean` que calcula SHA-256 do token fornecido e compara com `tokenHash`. Nenhuma dependencia externa.

**Rastreabilidade:** REQ-4 · NFR-3 · REQ-12 · REQ-6
**Depende de:** --
**Concluida quando:** Entidade criada com metodos isExpired, isUsed e compareHash; testes unitarios passam para todos os casos (token valido, expirado, usado, hash correto/incorreto).

---

### T-04: Criar migration da tabela password_reset_tokens

- [x] Criar migration Drizzle com schema `password_reset_tokens` contendo campos: `id` (UUID, PK), `user_id` (UUID, FK->users.id), `token_hash` (VARCHAR 255, NOT NULL), `expires_at` (TIMESTAMP, NOT NULL), `used_at` (TIMESTAMP, nullable), `created_at` (TIMESTAMP, default NOW). Adicionar constraint de FK para `users.id`.

**Rastreabilidade:** REQ-4
**Depende de:** --
**Concluida quando:** Migration executada com sucesso; `DESCRIBE password_reset_tokens` retorna todos os campos com tipos corretos e FK existente.

---

### T-05: Criar interface IPasswordResetTokenRepository (Port de saida)

- [x] Criar interface `IPasswordResetTokenRepository` na camada Domain com metodos: `create(data: CreatePasswordResetTokenParams): Promise<void>`, `findByHash(tokenHash: string): Promise<PasswordResetToken | null>`, `markAsUsed(tokenHash: string): Promise<void>`. A interface nao deve importar nada de infraestrutura (Drizzle, Next.js, etc.).

**Rastreabilidade:** REQ-4 · REQ-6
**Depende de:** T-03
**Concluida quando:** Interface definida com os tres metodos e tipos de retorno; nenhuma dependencia de infraestrutura no arquivo.

---

### T-06: Implementar adapter PasswordResetTokenRepositoryDrizzle

- [x] Implementar `PasswordResetTokenRepositoryDrizzle` que implementa `IPasswordResetTokenRepository`. `create()` insere registro com user_id, token_hash, expires_at. `findByHash()` busca por token_hash e retorna entidade PasswordResetToken ou null. `markAsUsed()` atualiza used_at para timestamp atual. Usar Drizzle ORM exclusivamente (constitution.md regra 15).

**Rastreabilidade:** REQ-4 · REQ-6 · NFR-3
**Depende de:** T-04, T-05
**Concluida quando:** Todos os tres metodos implementados e funcionando com banco real; testes de integracao IT-1, IT-2, IT-3 passam.

---

### T-07: Implementar caso de uso RequestPasswordResetUseCase.execute

- [x] Implementar metodo `execute(email: string)` no caso de uso. Consultar `IUserRepository.findByEmail`: se email existir e conta ativa, gerar token com `crypto.randomBytes(32)` (256 bits), calcular hash SHA-256, definir `expires_at = now + 12h`, persistir via `IPasswordResetTokenRepository.create`, disparar `IEmailService.sendPasswordReset` de forma assincrona (fire-and-forget, DT-3). Se email nao existir, executar o mesmo caminho sem gerar token nem enviar email (anti-enumeracao, REQ-14). Registrar operacao via AuditLogger. Retornar mensagem generica independente do resultado.

**Rastreabilidade:** REQ-4 · REQ-5 · REQ-14 · REQ-2 · NFR-3
**Depende de:** T-05, T-08, T-20
**Concluida quando:** Caso de uso gera token e persiste para email valido; nao gera token para email inexistente; retorna mesma mensagem em ambos os casos; testes unitarios UT-4 e UT-5 passam.

---

## REQ-5 — Enviar email com link de recuperacao

> Quando o token de recuperacao e gerado, o sistema deve enviar ao endereco de e-mail associado a conta uma mensagem contendo o link unico de recuperacao.

### T-08: Criar interface IEmailService (Port de saida)

- [x] Criar interface `IEmailService` na camada Domain com metodo `sendPasswordReset(email: string, token: string): Promise<void>`. O contrato nao deve depender de implementacao de envio (SMTP, API, etc.). O token em texto plano e passado para montagem do link pelo adapter.

**Rastreabilidade:** REQ-5
**Depende de:** --
**Concluida quando:** Interface definida com metodo sendPasswordReset; nenhuma dependencia de infraestrutura.

---

### T-09: Implementar adapter EmailServiceAdapter com envio assincrono

- [x] Implementar `EmailServiceAdapter` que implementa `IEmailService`. Montar link `https://<host>/auth/password-reset?token=<token>` e enviar via SMTP ou Resend. Envio deve ser assincrono (fire-and-forget, DT-3) — nao bloquear a resposta HTTP. Token nunca deve aparecer em logs (NFR-3). Usar configuracao via variaveis de ambiente para provedor de email. Falhas de envio devem ser capturadas e registradas via AuditLogger sem propagar ao usuario.

**Rastreabilidade:** REQ-5 · NFR-1 · NFR-3
**Depende de:** T-08
**Concluida quando:** Email com link contendo token e enviado com sucesso; token nao aparece em logs; adapter funciona com SMTP stub em modo de teste.

---

## REQ-6 — Invalidar token apos redefinicao

> Quando uma redefinicao de senha e concluida com sucesso, o sistema deve invalidar o token de recuperacao utilizado, impedindo sua reutilizacao.

**Nota:** Tasks deste requisito estao nos blocos REQ-4 (T-03, T-05, T-06) e REQ-10 (T-12 — ResetPasswordUseCase), por serem os REQs de menor numeracao que os implementam primariamente.

---

## REQ-7 — Exibir formulario de redefinicao ao acessar link valido

> Quando o usuario acessa o link de recuperacao contendo um token valido e dentro do prazo de expiracao, o sistema deve exibir a tela de redefinicao de senha com campos para nova senha e confirmacao.

### T-10: Implementar caso de uso ValidateResetTokenUseCase.execute

- [x] Implementar metodo `execute(token: string)` no caso de uso. Calcular hash SHA-256 do token recebido. Consultar `IPasswordResetTokenRepository.findByHash`. Se token encontrado, `used_at IS NULL` e `expires_at > now`: retorna estado `{ valid: true }`. Se expirado: retorna erro `TOKEN_EXPIRED`. Se nao encontrado: retorna erro `TOKEN_INVALID`.

**Rastreabilidade:** REQ-7 · REQ-12 · REQ-13 · NFR-4
**Depende de:** T-05
**Concluida quando:** Retorna valido para token ativo; expirado para token vencido; invalido para token inexistente; testes unitarios UT-6, UT-7, UT-8 passam.

---

### T-11: Criar endpoint GET /api/auth/password-reset/validate

- [x] Criar route handler em `app/api/auth/password-reset/validate/route.ts` para GET. Extrair token da query string. Validar formato basico do token (nao vazio, tamanho minimo) — se malformado, retornar 400 com `{ code: "TOKEN_INVALID" }`. Delegar a `ValidateResetTokenUseCase.execute`. Mapear erros: 404 para token nao encontrado, 410 para token expirado, 200 com `{ valid: true }` para token valido. Erros estruturados conforme constitution.md regra 5 (code, message, requestId, timestamp).

**Rastreabilidade:** REQ-7 · REQ-12 · REQ-13
**Depende de:** T-10
**Concluida quando:** Endpoint responde 200/400/404/410 conforme estado do token; testes E2E GH-3 (validacao), GH-7 (expirado) e GH-8 (invalido) passam.

---

### T-14: Criar componente de UI da pagina de redefinicao de senha

- [x] Criar pagina em `app/(auth)/redefinir-senha/page.tsx` com formulario contendo campos de nova senha e confirmacao, e botao "Redefinir senha" (`variant="default"`). Exibir mensagens de erro inline para senhas nao coincidentes e senha fraca. Utilizar Input do design-system com `type="password"`. Exibir criterios de forca da senha validados em tempo real.

**Rastreabilidade:** REQ-7 · REQ-9
**Depende de:** --
**Concluida quando:** Pagina renderiza formulario com campos de senha e confirmacao; aceita token via query string; exibe erros inline conforme REQ-8 e REQ-9.

---

## REQ-8 — Validar forca/complexidade da nova senha

> Se a nova senha informada nao atender aos criterios de forca e complexidade exigidos, o sistema deve rejeitar a submissao, manter o formulario visivel e exibir uma mensagem indicando quais criterios nao foram atendidos.

**Nota:** Task implementada no bloco REQ-10 (T-12 — ResetPasswordUseCase), por ser o REQ de menor numeracao que a implementa primariamente.

---

## REQ-9 — Validar confirmacao de senha

> Se o valor informado no campo de confirmacao de senha for diferente do valor informado no campo de nova senha, o sistema deve rejeitar a submissao, manter o formulario visivel e exibir a mensagem "As senhas nao coincidem".

### T-13: Implementar validacao de coincidencia de senhas no endpoint POST /api/auth/password-reset/confirm

- [x] No route handler de confirmacao, validar que `password === passwordConfirm` antes de delegar ao caso de uso. Se divergirem, retornar 400 com `{ code: "PASSWORDS_MISMATCH", message: "As senhas nao coincidem" }` sem invocar `ResetPasswordUseCase`. Validacao deve ocorrer no adapter HTTP inbound (constitution.md regra 4).

**Rastreabilidade:** REQ-9
**Depende de:** --
**Concluida quando:** Requisicao com senhas diferentes retorna 400 com code PASSWORDS_MISMATCH; caso de uso nao e invocado; teste E2E GH-4 passa.

---

## REQ-10 — Atualizar senha e invalidar sessoes ativas

> Quando o usuario submete uma nova senha valida com token de recuperacao valido, o sistema deve atualizar a credencial da conta e invalidar todas as sessoes ativas anteriores associadas a essa conta.

### T-12: Implementar caso de uso ResetPasswordUseCase.execute

- [x] Implementar metodo `execute(token: string, password: string)` no caso de uso. Calcular hash SHA-256 do token. Consultar `IPasswordResetTokenRepository.findByHash`. Validar token: se nao encontrado retornar `TOKEN_INVALID`; se expirado retornar `TOKEN_EXPIRED`; se ja usado retornar `TOKEN_INVALID`. Validar forca da senha (tamanho minimo, caracteres especiais, maiusculas, minusculas, numeros) — se nao atender, retornar `WEAK_PASSWORD` com criterios nao atendidos. Gerar hash da nova senha (bcrypt). Atualizar `users.password_hash` via `IUserRepository.updatePassword`. Invalidar todas as sessoes via `IUserRepository.invalidateAllSessions`. Invalidar token via `IPasswordResetTokenRepository.markAsUsed`. Registrar via AuditLogger.

**Rastreabilidade:** REQ-10 · REQ-8 · REQ-6 · NFR-4
**Depende de:** T-05, T-06
**Concluida quando:** Redefinicao bem-sucedida atualiza senha, invalida token e invalida sessoes; senha fraca e rejeitada sem alteracoes; token expirado/usado e rejeitado; testes unitarios UT-9, UT-10, UT-11, UT-12 passam.

---

## REQ-11 — Mensagem de sucesso e redirecionamento

> Quando a redefinicao de senha e concluida com sucesso, o sistema deve exibir uma mensagem de confirmacao de sucesso e redirecionar o usuario para a tela de login.

### T-15: Criar componente de UI da pagina de confirmacao de redefinicao

- [x] Criar componente de tela de confirmacao com mensagem "Senha redefinida com sucesso". Incluir botao/link para tela de login (`Button variant="link"` apontando para `/login`). Utilizar design-system tokens: icone de sucesso, cor foreground para titulo.

**Rastreabilidade:** REQ-11
**Depende de:** --
**Concluida quando:** Tela exibe mensagem de sucesso apos redefinicao e oferece redirecionamento para login; teste E2E GH-3 verifica redirecionamento.

---

## REQ-12 — Token expirado

> Se o usuario acessa um link de recuperacao cujo token esta expirado, o sistema deve rejeitar o acesso a tela de redefinicao, exibir a mensagem "O link de recuperacao expirou", redirecionar para a pagina de recuperacao e disponibilizar a opcao de solicitar um novo link.

**Nota:** Tasks deste requisito estao nos blocos REQ-4 (T-03), REQ-7 (T-10, T-11) e REQ-10 (T-12), por serem os REQs de menor numeracao.

---

## REQ-13 — Token malformado ou invalido

> Se o usuario acessa uma URL de recuperacao com token malformado ou nao reconhecido pelo sistema, o sistema deve rejeitar o acesso, exibir a mensagem "O link de recuperacao e invalido" e redirecionar para a pagina de recuperacao.

**Nota:** Tasks deste requisito estao nos blocos REQ-7 (T-10, T-11), REQ-4 (T-03) e REQ-10 (T-12), por serem os REQs de menor numeracao.

---

## REQ-14 — Anti-enumeracao para email inexistente

> Se o endereco de e-mail submetido no formulario de recuperacao nao estiver associado a nenhuma conta, o sistema nao deve enviar e-mail e deve exibir a mesma mensagem generica apresentada para contas existentes, sem revelar se o endereco esta ou nao cadastrado.

**Nota:** Task implementada no bloco REQ-4 (T-07 — RequestPasswordResetUseCase), que contem a logica de anti-enumeracao.

---

## REQ-15 — Link para pagina de cadastro

> Quando o sistema exibe a mensagem generica de confirmacao de solicitacao de recuperacao, o sistema deve apresentar um link de acesso a pagina de cadastro.

**Nota:** Task implementada no bloco REQ-2/15 (T-18 — endpoint POST /api/auth/password-reset/request).

---

## REQ-16 — Rate limit de 5 tentativas por IP por hora

> Se um endereco IP realizar 5 ou mais solicitacoes de recuperacao de senha dentro de um intervalo de 1 hora, o sistema deve bloquear tentativas subsequentes desse IP, exibir a mensagem "Muitas tentativas de recuperacao. Tente novamente em 1 hora" e registrar a tentativa bloqueada nos logs de seguranca.

### T-16: Criar interface IRateLimitService (Port de saida)

- [x] Criar interface `IRateLimitService` na camada Domain com metodo `check(key: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }>`. O metodo verifica se a chave (ex: IP) excedeu o limite de tentativas configurado.

**Rastreabilidade:** REQ-16
**Depende de:** --
**Concluida quando:** Interface definida com metodo check retornando estado de bloqueio; nenhuma dependencia de infraestrutura.

---

### T-17: Implementar adapter RateLimitServiceAdapter (in-memory)

- [x] Implementar `RateLimitServiceAdapter` com `Map<ip, { count, firstAttemptAt }>` e TTL calculado a partir de `firstAttemptAt`. Limite: 5 tentativas por IP por hora (janela deslizante). `check(ip)` incrementa contador e retorna `{ allowed: true }` se < 5, ou `{ allowed: false }` se >= 5. Desbloqueio automatico apos 1 hora da primeira tentativa do intervalo (REQ-17). Troca futura para Redis deve ser possivel sem alterar Domain (interface ja definida).

**Rastreabilidade:** REQ-16 · REQ-17 · NFR-5
**Depende de:** T-16
**Concluida quando:** 5 primeiras tentativas sao permitidas; 6a e bloqueada com { allowed: false }; apos 1h IP e desbloqueado; teste de integracao IT-6 passa.

---

## REQ-17 — Desbloqueio automatico apos 1 hora

> Enquanto um endereco IP estiver bloqueado para solicitacoes de recuperacao de senha, o sistema deve remover o bloqueio automaticamente apos decorrido 1 hora desde a primeira solicitacao do intervalo vigente.

**Nota:** Task implementada no bloco REQ-16 (T-17 — RateLimitServiceAdapter), que contem a logica de expiracao do bloqueio.

---

## Endpoint POST /api/auth/password-reset/request

### T-18: Criar endpoint POST /api/auth/password-reset/request

- [x] Criar route handler em `app/api/auth/password-reset/route.ts` para POST `/request`. Validar formato do email com schema Zod — se invalido, retornar 400. Aplicar rate limiting via `IRateLimitService.check(ip)` — se bloqueado, retornar 429 com `{ code: "RATE_LIMIT_EXCEEDED", message: "Muitas tentativas de recuperacao. Tente novamente em 1 hora" }` e registrar bloqueio no AuditLogger. Delegar a `RequestPasswordResetUseCase.execute(email)`. Retornar 200 com mensagem generica e link para pagina de cadastro (REQ-15). Erros estruturados conforme constitution.md regra 5 (code, message, requestId, timestamp).

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-15 · REQ-16
**Depende de:** T-07, T-17
**Concluida quando:** Endpoint responde 200 com mensagem generica para email valido e invalido; 400 para email malformatado; 429 para rate limit excedido; respostas incluem requestId e timestamp.

---

## Endpoint POST /api/auth/password-reset/confirm

### T-19: Criar endpoint POST /api/auth/password-reset/confirm

- [x] Criar route handler em `app/api/auth/password-reset/confirm/route.ts` para POST. Validar presenca de token, password e passwordConfirm no body. Validar coincidencia de senhas (T-13) — se divergirem, retornar 400 com `PASSWORDS_MISMATCH`. Delegar a `ResetPasswordUseCase.execute(token, password)`. Mapear erros: 400 para senha fraca (`WEAK_PASSWORD`), 404 para token nao encontrado (`TOKEN_INVALID`), 410 para token expirado (`TOKEN_EXPIRED`). Retornar 200 com `{ message: "Senha redefinida com sucesso" }` em caso de sucesso.

**Rastreabilidade:** REQ-8 · REQ-9 · REQ-10 · REQ-11 · REQ-12 · REQ-13
**Depende de:** T-12, T-13
**Concluida quando:** Endpoint responde 200 para redefinicao valida; 400 para senha fraca; 400 para senhas divergentes; 404/410 para token invalido/expirado; testes E2E GH-3, GH-4, GH-5 passam.

---

## NFR-6 — Observabilidade

### T-20: Implementar AuditLogger para registro estruturado das operacoes de recuperacao

- [x] Criar `AuditLogger` na camada de infraestrutura com metodo `log(event: AuditEvent)` que registra log estruturado (JSON) via OpenTelemetry/Loki. Eventos obrigatorios: solicitacao bem-sucedida (timestamp + IP), tentativa com email inexistente (timestamp + IP), bloqueio por rate limit (timestamp + IP + contagem), redefinicao concluida (timestamp + IP + userId). Token em texto plano nunca deve aparecer em logs (NFR-3). Logs devem ser retidos por minimo 1 ano (NFR-6).

**Rastreabilidade:** NFR-6 · REQ-16
**Depende de:** --
**Concluida quando:** Todos os eventos de auditoria sao registrados em formato JSON; token nunca aparece nos logs; teste de seguranca ST-4 verifica ausencia de token em logs.

---

## Testes Unitarios

### T-21: Cobrir PasswordResetToken com testes unitarios (UT-1, UT-2, UT-3)

- [ ] Implementar testes conforme test-strategy.md: UT-1 (isExpired com token futuro e passado), UT-2 (isUsed com used_at null e preenchido), UT-3 (compareHash com hash correto, incorreto e token vazio/nulo). Nenhum mock necessario — entidade pura.

**Rastreabilidade:** REQ-4 · REQ-12 · REQ-6 · NFR-3 · NFR-4 · REQ-13
**Depende de:** --
**Concluida quando:** UT-1, UT-2, UT-3 implementados e passando com cobertura de todos os casos definidos no test-strategy.md.

---

### T-22: Cobrir RequestPasswordResetUseCase com testes unitarios (UT-4, UT-5)

- [ ] Implementar testes conforme test-strategy.md: UT-4 (email de conta ativa — gera token, persiste hash, chama IEmailService; expires_at = now + 12h). UT-5 (email inexistente — nao gera token, nao envia email, resposta identica ao caminho feliz). Mocks: IUserRepository, IPasswordResetTokenRepository, IEmailService.

**Rastreabilidade:** REQ-4 · REQ-5 · REQ-2 · REQ-14
**Depende de:** --
**Concluida quando:** UT-4 e UT-5 implementados e passando com mocks; cobertura dos casos de anti-enumeracao.

---

### T-23: Cobrir ValidateResetTokenUseCase com testes unitarios (UT-6, UT-7, UT-8)

- [ ] Implementar testes conforme test-strategy.md: UT-6 (token valido retorna `{ valid: true }`), UT-7 (token expirado retorna erro `TOKEN_EXPIRED`), UT-8 (token nao encontrado retorna erro `TOKEN_INVALID`). Mock: IPasswordResetTokenRepository.

**Rastreabilidade:** REQ-7 · REQ-13 · REQ-12
**Depende de:** --
**Concluida quando:** UT-6, UT-7, UT-8 implementados e passando com mocks; todos os estados de token cobertos.

---

### T-24: Cobrir ResetPasswordUseCase com testes unitarios (UT-9, UT-10, UT-11, UT-12)

- [ ] Implementar testes conforme test-strategy.md: UT-9 (redefinicao bem-sucedida — chama updatePassword, invalidateAllSessions, markAsUsed). UT-10 (senha fraca — rejeita sem alterar nada). UT-11 (token ja utilizado — rejeita sem alterar). UT-12 (token expirado — rejeita sem alterar). Mocks: IPasswordResetTokenRepository, IUserRepository.

**Rastreabilidade:** REQ-6 · REQ-10 · REQ-8 · NFR-4 · REQ-12
**Depende de:** --
**Concluida quando:** UT-9, UT-10, UT-11, UT-12 implementados e passando; cobertura de todos os fluxos de erro do caso de uso.

---

### T-25: Cobrir PasswordRecoveryRouteHandler com teste unitario de validacao de entrada (UT-13)

- [ ] Implementar teste conforme test-strategy.md: UT-13 (email invalido retorna 400 sem invocar use case; email ausente retorna 400; password !== passwordConfirm retorna 400 com code PASSWORDS_MISMATCH sem invocar use case). Mocks: RequestPasswordResetUseCase, ResetPasswordUseCase, IRateLimitService.

**Rastreabilidade:** REQ-3 · REQ-9
**Depende de:** --
**Concluida quando:** UT-13 implementado e passando; todas as validacoes de entrada sao testadas antes da delegacao ao dominio.

---

## Testes de Integracao

### T-26: Cobrir PasswordResetTokenRepositoryDrizzle com testes de integracao (IT-1, IT-2, IT-3)

- [ ] Implementar testes conforme test-strategy.md: IT-1 (create persiste registro com campos corretos; user_id inexistente viola FK). IT-2 (findByHash retorna registro correto ou null). IT-3 (markAsUsed preenche used_at; operacao idempotente em token ja marcado). Usar banco de dados de teste (MySQL/SQLite). Setup: usuario existente na tabela users.

**Rastreabilidade:** REQ-4 · NFR-3 · REQ-7 · REQ-12 · REQ-13 · REQ-6 · NFR-4
**Depende de:** --
**Concluida quando:** IT-1, IT-2, IT-3 implementados e passando contra banco real; cobertura de FK violation e idempotencia.

---

### T-27: Cobrir metodos do IUserRepository usados pela feature com testes de integracao (IT-4)

- [ ] Implementar teste conforme test-strategy.md: IT-4 testa findByEmail (email existente retorna usuario; inexistente retorna null), updatePassword (password_hash atualizado), invalidateAllSessions (todos os registros de sessao removidos). Setup: usuario existente; sessoes ativas pre-criadas.

**Rastreabilidade:** REQ-10 · REQ-14
**Depende de:** --
**Concluida quando:** IT-4 implementado e passando; todos os tres metodos do IUserRepository cobertos.

---

### T-28: Cobrir EmailServiceAdapter com teste de integracao (IT-5)

- [ ] Implementar teste conforme test-strategy.md: IT-5 testa sendPasswordReset (email enviado com link contendo token via HTTPS; token nao exposto em logs). Provedor mockado (SMTP stub ou Resend sandbox). Setup via variavel de ambiente.

**Rastreabilidade:** REQ-5 · NFR-3
**Depende de:** --
**Concluida quando:** IT-5 implementado e passando; email enviado com link valido; erro de provedor capturado sem propagar ao usuario.

---

### T-29: Cobrir RateLimitServiceAdapter com teste de integracao (IT-6)

- [ ] Implementar teste conforme test-strategy.md: IT-6 testa check() (5 primeiras permitidas; 6a bloqueada; apos 1h IP desbloqueado). Controle de clock via mock de Date.now. Instancia limpa do adapter a cada teste.

**Rastreabilidade:** NFR-5 · REQ-16 · REQ-17
**Depende de:** --
**Concluida quando:** IT-6 implementado e passando; limite de 5 e desbloqueio automatico verificados com clock mockado.

---

## Testes E2E Gherkin

### T-30: Implementar teste E2E para GH-1 "Solicitar recuperacao com email valido"

- [ ] Implementar step definitions para o cenario GH-1: navegar para `/login`, clicar em "Esqueci a senha", verificar formulario com campo de email, preencher email valido e submeter, verificar resposta 200 com mensagem generica. Setup: usuario cadastrado ativo no banco.

**Rastreabilidade:** Scenario: "Solicitar recuperacao com email valido" · REQ-1 · REQ-2 · REQ-3
**Depende de:** --
**Concluida quando:** GH-1 implementado e passando em ambiente de teste E2E.

---

### T-31: Implementar teste E2E para GH-2 "Receber email com link valido"

- [ ] Implementar step definitions para o cenario GH-2: chamar POST /api/auth/password-reset/request com email valido, verificar que EmailServiceAdapter foi chamado, verificar que expires_at do token no banco e created_at + 12h. Setup: usuario ativo; stub de email.

**Rastreabilidade:** Scenario: "Receber email com link valido" · REQ-4 · REQ-5
**Depende de:** --
**Concluida quando:** GH-2 implementado e passando; token com expiracao de 12h verificado.

---

### T-32: Implementar teste E2E para GH-3 "Redefinir senha com link valido"

- [ ] Implementar step definitions para o cenario GH-3: criar token valido no banco, chamar GET /validate com sucesso, submeter POST /confirm com senha forte e confirmacao, verificar resposta 200 e mensagem de sucesso, verificar redirecionamento para login. Setup: usuario ativo; token valido inserido diretamente no banco.

**Rastreabilidade:** Scenario: "Redefinir senha com link valido" · REQ-7 · REQ-8 · REQ-10 · REQ-11
**Depende de:** --
**Concluida quando:** GH-3 implementado e passando; fluxo completo de redefinicao validado.

---

### T-33: Implementar teste E2E para GH-4 "Redefinir senha com senhas nao coincidentes"

- [ ] Implementar step definitions para o cenario GH-4: criar token valido, chamar GET /validate com sucesso, submeter POST /confirm com password !== passwordConfirm, verificar resposta 400 com code PASSWORDS_MISMATCH, verificar que formulario permanece visivel. Step "Given que o usuario acessou a tela de redefinicao" reutilizavel com GH-5.

**Rastreabilidade:** Scenario: "Redefinir senha com senhas nao coincidentes" · REQ-9
**Depende de:** --
**Concluida quando:** GH-4 implementado e passando; erro de senhas divergentes verificado.

---

### T-34: Implementar teste E2E para GH-5 "Redefinir senha com senha fraca"

- [ ] Implementar step definitions para o cenario GH-5: criar token valido, submeter POST /confirm com senha invalida (ex: "12345678"), verificar resposta 400 com code WEAK_PASSWORD e criterios nao atendidos, verificar que formulario permanece visivel. Reutilizar step "Given que o usuario acessou a tela de redefinicao" de GH-4.

**Rastreabilidade:** Scenario: "Redefinir senha com senha fraca" · REQ-8
**Depende de:** --
**Concluida quando:** GH-5 implementado e passando; erro de senha fraca verificado com criterios.

---

### T-35: Implementar teste E2E para GH-6 "Solicitar recuperacao com email inexistente"

- [ ] Implementar step definitions para o cenario GH-6: submeter POST /api/auth/password-reset/request com email nao cadastrado, verificar resposta 200 (nao 404), verificar mensagem generica, verificar link para cadastro, verificar que email nao foi enviado (stub). Setup: email nao cadastrado no banco.

**Rastreabilidade:** Scenario: "Solicitar recuperacao com email inexistente" · REQ-2 · REQ-14 · REQ-15
**Depende de:** --
**Concluida quando:** GH-6 implementado e passando; anti-enumeracao e link de cadastro verificados.

---

### T-36: Implementar teste E2E para GH-7 "Acessar link expirado"

- [ ] Implementar step definitions para o cenario GH-7: criar token no banco com expires_at no futuro, atualizar expires_at para o passado via SQL direto, chamar GET /validate, verificar resposta 410 com code TOKEN_EXPIRED, verificar opcao de solicitar novo link. Setup: token inserido no banco.

**Rastreabilidade:** Scenario: "Acessar link expirado" · REQ-12
**Depende de:** --
**Concluida quando:** GH-7 implementado e passando; token expirado rejeitado com 410 e opcao de novo link.

---

### T-37: Implementar teste E2E para GH-8 "Acessar link com token invalido"

- [ ] Implementar step definitions para o cenario GH-8: preparar token malformado (string curta) e token com formato valido mas inexistente no banco. Chamar GET /validate em ambos os casos. Verificar resposta 400 (malformado) ou 404 (nao encontrado) com code TOKEN_INVALID. Setup: banco sem token usado.

**Rastreabilidade:** Scenario: "Acessar link com token invalido" · REQ-13
**Depende de:** --
**Concluida quando:** GH-8 implementado e passando; ambos os casos de token invalido cobertos.

---

### T-38: Implementar teste E2E para GH-9 "Exceder limite de tentativas de solicitacao"

- [ ] Implementar step definitions para o cenario GH-9: chamar POST /request 5 vezes com mesmo IP, verificar 200 em todas. Chamar 6a vez, verificar resposta 429 com code RATE_LIMIT_EXCEEDED e mensagem de 1 hora. Verificar que caso de uso nao foi invocado na 6a tentativa. Verificar log de auditoria registrado. Setup: IP fixo via header X-Forwarded-For; adapter com estado zerado.

**Rastreabilidade:** Scenario: "Exceder limite de tentativas de solicitacao" · REQ-16 · NFR-5 · NFR-6
**Depende de:** --
**Concluida quando:** GH-9 implementado e passando; rate limit e auditoria verificados.

---

## Testes de Seguranca

### T-39: Implementar teste de seguranca ST-1: Prevencao de enumeracao de contas

- [ ] Implementar teste conforme test-strategy.md: enviar POST /request para email cadastrado e nao cadastrado. Verificar que ambas as respostas sao identicas em status HTTP (200) e body. Medir diferenca de tempo de resposta: p95 dos dois conjuntos deve ter diferenca < 50ms (anti-enumeracao temporal).

**Rastreabilidade:** NFR-3 · REQ-14
**Depende de:** --
**Concluida quando:** ST-1 implementado e passando; resposta e tempo indistinguiveis entre email existente e inexistente.

---

### T-40: Implementar teste de seguranca ST-2: Prevencao de reutilizacao de token

- [ ] Implementar teste conforme test-strategy.md: realizar redefinicao bem-sucedida com token valido (resposta 200). Tentar reutilizar o mesmo token (chamar POST /confirm novamente). Verificar que segunda tentativa retorna 410 com code TOKEN_INVALID. Verificar que used_at foi preenchido no banco.

**Rastreabilidade:** NFR-4 · REQ-6
**Depende de:** --
**Concluida quando:** ST-2 implementado e passando; token rejeitado apos primeiro uso.

---

### T-41: Implementar teste de seguranca ST-3: Rate limiting por IP

- [ ] Implementar teste conforme test-strategy.md: enviar 5 requisicoes do mesmo IP (200), enviar 6a requisicao (429). Verificar log de auditoria com evento de bloqueio. Enviar requisicao de IP diferente apos bloqueio do primeiro — deve retornar 200 (bloqueio por IP, nao global).

**Rastreabilidade:** NFR-5 · REQ-16
**Depende de:** --
**Concluida quando:** ST-3 implementado e passando; bloqueio por IP verificado e isolado por IP.

---

### T-42: Implementar teste de seguranca ST-4: Token nao exposto em logs, respostas ou erros

- [ ] Implementar teste conforme test-strategy.md: apos solicitacao com email valido, verificar que logs de auditoria nao contem token em texto plano. Apos tentativa com token invalido, verificar que mensagem de erro nao ecoa o token recebido. Verificar que nenhum campo de resposta de nenhum endpoint contem o token completo.

**Rastreabilidade:** NFR-3
**Depende de:** --
**Concluida quando:** ST-4 implementado e passando; token nunca aparece em outputs observaveis (logs, erros, respostas).

---

### T-43: Implementar teste de seguranca ST-5: Invalidacao de sessoes ativas apos redefinicao

- [ ] Implementar teste conforme test-strategy.md: criar sessao ativa para usuario antes da redefinicao. Executar POST /confirm com sucesso. Tentar usar token de sessao anterior em requisicao autenticada — verificar 401. Verificar que multiplas sessoes sao todas invalidadas.

**Rastreabilidade:** REQ-10
**Depende de:** --
**Concluida quando:** ST-5 implementado e passando; sessoes anteriores sao rejeitadas apos redefinicao.

---

## Testes de Performance

### T-44: Implementar teste de performance PT-1: Latencia do endpoint POST /api/auth/password-reset/confirm (p95)

- [ ] Implementar benchmark conforme test-strategy.md: 100 requisicoes sequenciais com tokens unicos pre-criados. Medir p95 do tempo de resposta do endpoint confirm (validacao de token, atualizacao de senha, invalidacao de sessoes). Threshold: p95 <= 500ms. Usar autocannon ou k6 contra servidor em modo de teste com banco real.

**Rastreabilidade:** NFR-2
**Depende de:** --
**Concluida quando:** PT-1 implementado e executavel; resultado documentado com p95 medido.

---

### T-45: Implementar teste de performance PT-2: Tempo de disparo do envio de email (p95)

- [ ] Implementar benchmark conforme test-strategy.md: 50 execucoes com emails distintos. Medir intervalo entre resposta HTTP do endpoint request e chamada ao EmailServiceAdapter disparando o envio. Threshold: disparo em <= 5s para 95% dos casos. Usar stub de email instrumentado com timestamp de chamada.

**Rastreabilidade:** NFR-1
**Depende de:** --
**Concluida quando:** PT-2 implementado e executavel; resultado documentado com p95 do intervalo request-to-dispatch.

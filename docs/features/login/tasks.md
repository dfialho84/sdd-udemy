# Tasks — Login

## REQ-1 — Exibir formulário de login

> When the user navigates to the login page, the system shall display a form with fields for identifier and password.

### T-01: Criar componente `LoginPage` com formulário de identificador e senha

- [x] Implementar a página de login em `app/(auth)/login/page.tsx` com os campos `identifier` (text) e `password` (password) conforme a tela especificada em `views/pagina-de-login/tela.md`. Usar React Hook Form para controle do formulário. O botão "Login" é do tipo `submit` com `variant="default"` e `size="lg"` do design system.

**Rastreabilidade:** REQ-1 · Scenario: "Login bem-sucedido com usuário"
**Depende de:** —
**Concluída quando:** A página renderiza o formulário com os dois campos e o botão, fiel ao protótipo em `views/pagina-de-login/login page.png`.

---

### T-02: Criar schema Zod de validação do payload de login

- [x] Definir um schema Zod para o payload de login com os campos `identifier` (string, não vazio) e `password` (string, não vazio). O schema é usado pelo `LoginRouteHandler` para validar a entrada antes de delegar ao Domain.

**Rastreabilidade:** REQ-1 · REQ-6
**Depende de:** —
**Concluída quando:** O schema rejeita payloads com `identifier` ou `password` ausentes ou vazios e aprova payloads válidos.

---

### T-03: Implementar estado de loading no botão de submit da `LoginPage`

- [x] Após o submit do formulário, o botão "Login" deve exibir estado de loading (spinner interno, desabilitado) enquanto aguarda resposta do servidor. Usar o estado `Loading` do componente `Button` do design system.

**Rastreabilidade:** REQ-1 · NFR-1
**Depende de:** T-01
**Concluída quando:** O botão fica desabilitado com indicador visual de loading entre o submit e a resposta do servidor.

---

### T-04: Exibir mensagem de erro genérica na `LoginPage`

- [x] Implementar a área de exibição de mensagem de erro na `LoginPage`. Quando next-auth retorna erro de autenticação, exibir a mensagem recebida (ex: "Usuário ou senha incorretos"). Quando o identificador está bloqueado, exibir "Muitas tentativas fracassadas. Tente novamente em 15 minutos".

**Rastreabilidade:** REQ-5 · REQ-6 · REQ-7 · REQ-10 · REQ-11 · NFR-6
**Depende de:** T-01
**Concluída quando:** Mensagens de erro e de bloqueio são exibidas na página sem redirecionar o usuário.

---

## REQ-2 — Autenticar usuário com credenciais válidas

> When the user submits the login form with a valid identifier and matching password, the system shall authenticate the user.

### T-05: Criar interface `PasswordVerifier` (Port outbound)

- [x] Definir a interface `PasswordVerifier` na camada Domain com o método `verify(password: string, hash: string): Promise<boolean>`. A interface abstrai o algoritmo de verificação concreto, mantendo o Domain desacoplado da biblioteca argon2.

**Rastreabilidade:** REQ-2
**Depende de:** —
**Concluída quando:** A interface existe no Domain sem nenhuma importação de biblioteca externa e o `AuthenticateUserUseCase` pode depender dela via injeção.

---

### T-06: Implementar `Argon2PasswordVerifier` (adapter concreto argon2id)

- [x] Implementar o adapter `Argon2PasswordVerifier` na camada de infraestrutura, concretizando a interface `PasswordVerifier`. Usar a biblioteca `argon2` com parâmetros: 64 MB de memória, 3 iterações, paralelismo 2 — idênticos aos usados na feature `register-user` (DT-3).

**Rastreabilidade:** REQ-2 · NFR-6
**Depende de:** T-05
**Concluída quando:** `Argon2PasswordVerifier.verify()` retorna `true` para senha correta e `false` para senha incorreta, comparando com hash argon2id gerado pelos mesmos parâmetros.

---

### T-07: Criar tipo `LoginUser` no Domain

- [x] Definir o tipo `LoginUser` no Domain com os campos `id`, `username`, `email`, `passwordHash` e `status` (`active` | `pending`). Apenas usuários com `status: active` podem autenticar. Sem dependência de Drizzle ou Next.js.

**Rastreabilidade:** REQ-2
**Depende de:** —
**Concluída quando:** O tipo existe no Domain sem importações externas e representa fielmente a entidade `users` do modelo de dados.
**Implementado em:** `src/domain/entities/login-user.ts`

---

### T-08: Criar interface `UserRepository` (Port outbound)

- [x] Definir a interface `UserRepository` na camada Domain com o método `findByIdentifier(identifier: string): Promise<User | null>`. O método busca por `username` ou `email`, retornando apenas usuários com `status: active`.

**Rastreabilidade:** REQ-2
**Depende de:** T-07
**Concluída quando:** A interface existe no Domain sem importações externas e o `AuthenticateUserUseCase` pode depender dela via injeção.

---

### T-09: Implementar `DrizzleUserRepository` com `findByIdentifier`

- [ ] Implementar o adapter `DrizzleUserRepository` na camada de infraestrutura, concretizando `UserRepository`. O método `findByIdentifier` busca na tabela `users` por `username` OU `email` com `status = 'active'`, usando Drizzle + MySQL.

**Rastreabilidade:** REQ-2
**Depende de:** T-08
**Concluída quando:** `findByIdentifier("alice")` retorna o usuário quando existe com status active; retorna `null` quando não existe ou status é pending.

---

### T-10: Cobrir UT-1 — `Argon2PasswordVerifier.verify()`

- [ ] Escrever testes unitários para `Argon2PasswordVerifier.verify()`: (a) retorna `true` para senha correta, (b) retorna `false` para senha incorreta, (c) não lança exceção para hash malformado.

**Rastreabilidade:** REQ-2 · NFR-6 · Scenario: "Login bem-sucedido com usuário"
**Depende de:** —
**Concluída quando:** Os 3 casos passam com `npm run test`.

---

### T-11: Cobrir IT-7 — Integração `Argon2PasswordVerifier` com hash real

- [ ] Escrever teste de integração que gera um hash argon2id com os parâmetros definidos (64 MB, 3 iterações, paralelismo 2) e verifica que `Argon2PasswordVerifier.verify()` retorna `true` para a senha original e `false` para outra senha.

**Rastreabilidade:** REQ-2 · NFR-6
**Depende de:** —
**Concluída quando:** Teste de integração passa com `npm run test`.

---

## REQ-3 — Criar sessão autenticada

> When the user is successfully authenticated, the system shall create an authenticated session for the user.

### T-12: Implementar `AuthenticateUserUseCase` — fluxo de autenticação bem-sucedida

- [ ] Implementar o caso de uso `AuthenticateUserUseCase.execute({ identifier, password })` na camada Domain. O fluxo deve: (1) verificar bloqueio ativo via `LoginAttemptRepository`, (2) buscar usuário via `UserRepository`, (3) verificar senha via `PasswordVerifier`, (4) registrar tentativa bem-sucedida via `LoginAttemptRepository.save`, (5) retornar `{ id, username, email }` para o adapter de sessão. Sem lógica de negócio fora do Domain.

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-13 · NFR-7
**Depende de:** T-05 · T-07 · T-08 · T-25
**Concluída quando:** O use case, testado com mocks dos Ports, retorna os dados do usuário quando as credenciais são válidas e não há bloqueio ativo.

---

### T-13: Implementar `NextAuthSessionAdapter` e configurar `authorize` callback

- [ ] Configurar o `authorize` callback do next-auth em `app/api/auth/[...nextauth]/route.ts` como adapter fino: validar apenas que `identifier` não está vazio (schema Zod), delegar integralmente ao `AuthenticateUserUseCase` via Port, e retornar o objeto de usuário ao next-auth para criação da sessão. Nenhuma regra de negócio no callback.

**Rastreabilidade:** REQ-3 · REQ-6
**Depende de:** T-02 · T-12
**Concluída quando:** O `authorize` callback retorna o objeto de usuário ao next-auth quando `AuthenticateUserUseCase` retorna sucesso, e retorna `null` quando o use case lança erro.

---

### T-14: Criar `LoginRouteHandler` para o endpoint `POST /api/auth/callback/credentials`

- [ ] Configurar o `LoginRouteHandler` em `app/api/auth/[...nextauth]/route.ts` exportando o handler do next-auth. Garantir que erros de autenticação (401) e bloqueio (429) seguem a estrutura padronizada `{ código, mensagem, requestId, timestamp }` conforme constitution.md regra 5.

**Rastreabilidade:** REQ-3 · REQ-5 · REQ-10
**Depende de:** T-13
**Concluída quando:** O endpoint existe e responde 200 (sessão criada), 401 (credenciais inválidas) ou 429 (bloqueio) com estrutura de erro padronizada.

---

## REQ-4 — Redirecionar para área pessoal

> When the user is successfully authenticated, the system shall redirect the user to their personal area.

### T-15: Configurar redirecionamento pós-autenticação para `/users/<id>`

- [ ] Configurar o `callbackUrl` do next-auth para redirecionar o usuário autenticado para `/users/<id>` após login bem-sucedido. A configuração fica em `NextAuthOptions` no `LoginRouteHandler`.

**Rastreabilidade:** REQ-4 · NFR-2
**Depende de:** T-13
**Concluída quando:** Após autenticação bem-sucedida, o navegador redireciona para `/users/<id-do-usuario>` em até 500 ms para 95% dos casos (NFR-2).

---

### T-16: Cobrir E2E — Scenarios "Login bem-sucedido com usuário" e "Login bem-sucedido com email"

- [ ] Implementar steps Cypress/Cucumber para os scenarios GH-1 e GH-2: preencher formulário com credenciais válidas (por username e por email), submeter, verificar criação de sessão e redirecionamento para `/users/<id>`.

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-4 · Scenario: "Login bem-sucedido com usuário" · Scenario: "Login bem-sucedido com email"
**Depende de:** T-14 · T-15
**Concluída quando:** Os dois scenarios E2E passam com `npx cypress run`.

---

## REQ-5 — Rejeitar credenciais inválidas com mensagem genérica

> If the submitted credentials do not match any active account, the system shall reject the authentication attempt and display the generic message "Usuário ou senha incorretos".

### T-17: Implementar tratamento de erro de autenticação no `AuthenticateUserUseCase`

- [ ] No `AuthenticateUserUseCase`, implementar o comportamento quando o usuário não existe (retorno `null` do `UserRepository`) ou a senha não confere (retorno `false` do `PasswordVerifier`): em ambos os casos, registrar tentativa como `success: false` via `LoginAttemptRepository.save` e lançar erro de autenticação genérico sem diferenciar os casos (NFR-6).

**Rastreabilidade:** REQ-5 · NFR-6 · REQ-13
**Depende de:** T-12
**Concluída quando:** O use case lança erro genérico em ambos os cenários (inexistente e senha errada) sem vazar informação sobre qual caso ocorreu.

---

### T-18: Cobrir UT-9 — `execute()` com usuário inexistente

- [ ] Escrever teste unitário para `AuthenticateUserUseCase.execute()` quando `UserRepository.findByIdentifier` retorna `null`: verificar que o use case registra a tentativa com `success: false`, não chama `PasswordVerifier`, e lança erro de autenticação.

**Rastreabilidade:** REQ-5 · NFR-6 · Scenario: "Login com usuário inexistente"
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

### T-19: Cobrir UT-10 — `execute()` com senha incorreta

- [ ] Escrever teste unitário para `AuthenticateUserUseCase.execute()` quando `PasswordVerifier.verify` retorna `false`: verificar que o use case registra a tentativa com `success: false` e lança erro de autenticação genérico.

**Rastreabilidade:** REQ-5 · NFR-6 · Scenario: "Login com senha incorreta"
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

### T-20: Cobrir E2E — Scenarios "Login com senha incorreta" e "Login com usuário inexistente"

- [ ] Implementar steps Cypress/Cucumber para os scenarios GH-4 e GH-5: submeter formulário com senha incorreta e com usuário inexistente, verificar que a mensagem "Usuário ou senha incorretos" é exibida e o usuário permanece na página de login.

**Rastreabilidade:** REQ-5 · REQ-7 · NFR-6 · Scenario: "Login com senha incorreta" · Scenario: "Login com usuário inexistente"
**Depende de:** T-14
**Concluída quando:** Os dois scenarios E2E passam com `npx cypress run`.

---

## REQ-6 — Rejeitar identificador vazio

> If the user submits the login form with an empty identifier field, the system shall reject the authentication attempt and display the generic message "Usuário ou senha incorretos".

### T-21: Implementar rejeição de `identifier` vazio no `LoginRouteHandler`

- [ ] No `LoginRouteHandler` (adapter), usar o schema Zod de validação (T-02) para detectar `identifier` vazio antes de invocar o `AuthenticateUserUseCase`. Retornar HTTP 401 com mensagem "Usuário ou senha incorretos" sem chegar ao Domain.

**Rastreabilidade:** REQ-6 · NFR-6
**Depende de:** T-02 · T-14
**Concluída quando:** Uma requisição com `identifier` vazio recebe resposta 401 com mensagem genérica e o `AuthenticateUserUseCase` não é invocado.

---

### T-22: Cobrir UT-8 — `authorize` callback com `identifier` vazio

- [ ] Escrever teste unitário para o `authorize` callback garantindo que `identifier` vazio resulta em retorno `null` ao next-auth (que produzirá 401) sem invocar `AuthenticateUserUseCase`.

**Rastreabilidade:** REQ-6 · NFR-6 · Scenario: "Login com identificador vazio"
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

### T-23: Cobrir E2E — Scenario "Login com identificador vazio"

- [ ] Implementar steps Cypress/Cucumber para o scenario GH-3: submeter formulário sem preencher o campo de identificador, verificar que a mensagem "Usuário ou senha incorretos" é exibida e o usuário permanece na página de login.

**Rastreabilidade:** REQ-6 · REQ-7 · NFR-6 · Scenario: "Login com identificador vazio"
**Depende de:** T-14
**Concluída quando:** O scenario E2E passa com `npx cypress run`.

---

## REQ-7 — Manter usuário na página após falha de autenticação

> If the authentication attempt is rejected, the system shall keep the user on the login page.

> Cobertura de REQ-7 incorporada nas tasks T-20 e T-23 (scenarios de falha). O comportamento é resultado direto do retorno de erro do next-auth sem redirecionamento de sucesso.

---

## REQ-8 e REQ-9 — Contar falhas e bloquear identificador após 3 tentativas

> REQ-8: The system shall allow a maximum of 3 failed authentication attempts per identifier within a 10-minute window.
> REQ-9: If an identifier reaches 3 failed authentication attempts within a 10-minute window, the system shall block that identifier from further authentication attempts for 15 minutes.

### T-24: Criar tipos `LoginAttempt` e `LoginBlock` no Domain

- [ ] Definir os tipos `LoginAttempt` (id, identifier, success, created_at) e `LoginBlock` (id, identifier, blocked_until, created_at) no Domain, sem dependência de Drizzle ou Next.js. Esses tipos representam o modelo de dados das tabelas `login_attempts` e `login_blocks`.

**Rastreabilidade:** REQ-8 · REQ-9 · REQ-13
**Depende de:** —
**Concluída quando:** Os tipos existem no Domain sem importações externas.

---

### T-25: Criar interface `LoginAttemptRepository` (Port outbound)

- [ ] Definir a interface `LoginAttemptRepository` no Domain com os métodos: `save(attempt)`, `countRecentFailures(identifier, windowMinutes)`, `findActiveBlock(identifier)`, `createBlock(identifier, blockedUntil)`, `removeBlock(identifier)` e `resetFailureCount(identifier)`. Cada método representa uma operação distinta.

**Rastreabilidade:** REQ-8 · REQ-9 · REQ-12 · REQ-13
**Depende de:** T-24
**Concluída quando:** A interface existe no Domain com todos os 6 métodos declarados e o `AuthenticateUserUseCase` pode depender dela via injeção.

---

### T-26: Criar migration das tabelas `login_attempts` e `login_blocks`

- [ ] Criar a migration Drizzle que cria as tabelas `login_attempts` (id UUID, identifier string, success boolean, created_at timestamp) e `login_blocks` (id UUID, identifier string, blocked_until timestamp, created_at timestamp). Adicionar índice em `identifier` em ambas as tabelas para performance das consultas de janela deslizante (NFR-1).

**Rastreabilidade:** REQ-8 · REQ-9 · NFR-1
**Depende de:** T-24
**Concluída quando:** A migration é executada sem erros e as tabelas existem no banco MySQL com os índices criados.

---

### T-27: Implementar `DrizzleLoginAttemptRepository.save`

- [ ] Implementar o método `save` no adapter `DrizzleLoginAttemptRepository`: persiste uma tentativa de autenticação (identifier, success, created_at) na tabela `login_attempts` via Drizzle + MySQL.

**Rastreabilidade:** REQ-13 · NFR-7
**Depende de:** T-25 · T-26
**Concluída quando:** `save({ identifier: "alice", success: false, created_at: now })` insere registro na tabela e o método é verificável por teste de integração.

---

### T-28: Implementar `DrizzleLoginAttemptRepository.countRecentFailures`

- [ ] Implementar o método `countRecentFailures(identifier, windowMinutes)` no adapter `DrizzleLoginAttemptRepository`: consulta a tabela `login_attempts` contando registros com `success = false` para o `identifier` nos últimos `windowMinutes` minutos (janela deslizante).

**Rastreabilidade:** REQ-8 · NFR-3
**Depende de:** T-25 · T-26
**Concluída quando:** O método retorna a contagem correta de falhas na janela de 10 minutos, verificável por teste de integração.

---

### T-29: Implementar `DrizzleLoginAttemptRepository.findActiveBlock`

- [ ] Implementar o método `findActiveBlock(identifier)` no adapter `DrizzleLoginAttemptRepository`: consulta a tabela `login_blocks` retornando o registro de bloqueio ativo (com `blocked_until > now`) para o `identifier`, ou `null` se não houver bloqueio.

**Rastreabilidade:** REQ-9 · REQ-11 · NFR-4
**Depende de:** T-25 · T-26
**Concluída quando:** O método retorna o bloqueio quando existe e está vigente, e `null` quando não existe ou expirou.

---

### T-30: Implementar `DrizzleLoginAttemptRepository.createBlock`

- [ ] Implementar o método `createBlock(identifier, blockedUntil)` no adapter `DrizzleLoginAttemptRepository`: insere registro na tabela `login_blocks` com `blocked_until = now + 15 minutos`.

**Rastreabilidade:** REQ-9 · NFR-4
**Depende de:** T-25 · T-26
**Concluída quando:** O método insere o bloqueio na tabela com `blocked_until` correto, verificável por teste de integração.

---

### T-31: Implementar regras de domínio em `LoginDomain`

- [ ] Implementar a classe `LoginDomain` com os métodos: `isBlocked(block: LoginBlock | null): boolean` (verifica se `blocked_until > now`), `shouldActivateBlock(failureCount: number): boolean` (retorna `true` quando `failureCount >= 3`), e `calculateBlockExpiration(from: Date): Date` (retorna `from + 15 minutos`). Sem dependências externas.

**Rastreabilidade:** REQ-8 · REQ-9 · REQ-11 · REQ-12
**Depende de:** T-24
**Concluída quando:** Os três métodos existem no Domain com lógica pura, testáveis sem mocks.

---

### T-32: Integrar lógica de bloqueio no `AuthenticateUserUseCase`

- [ ] Expandir `AuthenticateUserUseCase.execute()` para: após falha de autenticação, chamar `LoginAttemptRepository.countRecentFailures` e, se `LoginDomain.shouldActivateBlock` retornar `true`, chamar `LoginAttemptRepository.createBlock` com expiração calculada por `LoginDomain.calculateBlockExpiration`. Lançar erro de bloqueio (429) em vez de 401.

**Rastreabilidade:** REQ-8 · REQ-9 · NFR-3 · NFR-4
**Depende de:** T-12 · T-25 · T-31
**Concluída quando:** Após 3 tentativas falhas em 10 minutos, o use case cria o bloqueio e lança erro diferenciado de bloqueio.

---

### T-33: Cobrir UT-2 — `LoginDomain.isBlocked()`

- [ ] Escrever testes unitários para `LoginDomain.isBlocked()`: (a) retorna `true` quando `blocked_until > now`, (b) retorna `false` quando `blocked_until < now`, (c) retorna `false` quando `block` é `null`.

**Rastreabilidade:** REQ-9 · REQ-11 · REQ-12
**Depende de:** —
**Concluída quando:** Os 3 casos passam com `npm run test`.

---

### T-34: Cobrir UT-3 — `LoginDomain.shouldActivateBlock()`

- [ ] Escrever testes unitários para `LoginDomain.shouldActivateBlock()`: (a) retorna `true` quando `failureCount = 3`, (b) retorna `true` quando `failureCount > 3`, (c) retorna `false` quando `failureCount < 3`.

**Rastreabilidade:** REQ-8 · NFR-3
**Depende de:** —
**Concluída quando:** Os 3 casos passam com `npm run test`.

---

### T-35: Cobrir UT-4 — `LoginDomain.calculateBlockExpiration()`

- [ ] Escrever teste unitário para `LoginDomain.calculateBlockExpiration(from)`: verificar que retorna exatamente `from + 15 minutos`.

**Rastreabilidade:** REQ-9 · NFR-4
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

### T-36: Cobrir UT-11 — `execute()` com bloqueio ativo

- [ ] Escrever teste unitário para `AuthenticateUserUseCase.execute()` quando `LoginAttemptRepository.findActiveBlock` retorna bloqueio vigente: verificar que o use case lança erro de bloqueio sem chamar `UserRepository` ou `PasswordVerifier`.

**Rastreabilidade:** REQ-11 · NFR-4 · Scenario: "Tentar login durante período de bloqueio"
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

### T-37: Cobrir UT-12 — `execute()` ativa bloqueio após 3 falhas

- [ ] Escrever teste unitário para `AuthenticateUserUseCase.execute()` quando `countRecentFailures` retorna 3: verificar que o use case chama `createBlock` com o `blocked_until` correto e lança erro de bloqueio.

**Rastreabilidade:** REQ-9 · NFR-4 · Scenario: "Bloquear após 3 tentativas erradas em 10 minutos"
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

### T-38: Cobrir IT-4 — `LoginAttemptRepository.countRecentFailures`

- [ ] Escrever teste de integração para `DrizzleLoginAttemptRepository.countRecentFailures`: inserir 3 tentativas falhas nos últimos 10 minutos e 1 tentativa falha há mais de 10 minutos, verificar que o método retorna 3 (não 4).

**Rastreabilidade:** REQ-8 · NFR-3
**Depende de:** —
**Concluída quando:** Teste de integração passa com `npm run test`.

---

### T-39: Cobrir IT-5 — `LoginAttemptRepository` ciclo completo de bloqueio

- [ ] Escrever teste de integração para o ciclo completo de `DrizzleLoginAttemptRepository`: `createBlock`, `findActiveBlock` (retorna bloqueio), expirar o `blocked_until`, `findActiveBlock` (retorna null após expiração).

**Rastreabilidade:** REQ-9 · REQ-12 · NFR-4
**Depende de:** —
**Concluída quando:** Teste de integração passa com `npm run test`.

---

### T-40: Cobrir E2E — Scenario "Bloquear após 3 tentativas erradas em 10 minutos"

- [ ] Implementar steps Cypress/Cucumber para o scenario GH-6: realizar 3 tentativas falhas seguidas, verificar que na quarta tentativa a mensagem "Muitas tentativas fracassadas. Tente novamente em 15 minutos" é exibida e o login é bloqueado.

**Rastreabilidade:** REQ-8 · REQ-9 · REQ-10 · NFR-3 · NFR-4 · Scenario: "Bloquear após 3 tentativas erradas em 10 minutos"
**Depende de:** T-14 · T-32
**Concluída quando:** O scenario E2E passa com `npx cypress run`.

---

## REQ-10 — Exibir mensagem de bloqueio

> If the identifier is blocked, the system shall display the message "Muitas tentativas fracassadas. Tente novamente em 15 minutos".

> Cobertura de REQ-10 incorporada nas tasks T-04 (exibição na LoginPage) e T-14 (retorno 429 no handler). Nenhuma task adicional necessária.

---

## REQ-11 — Rejeitar tentativas durante período de bloqueio

> While an identifier is blocked, the system shall reject any authentication attempt for that identifier regardless of the credentials provided.

### T-41: Cobrir E2E — Scenario "Tentar login durante período de bloqueio"

- [ ] Implementar steps Cypress/Cucumber para o scenario GH-7: dado que o identificador "alice" está bloqueado, tentar login e verificar que a mensagem de bloqueio é exibida independentemente das credenciais informadas.

**Rastreabilidade:** REQ-11 · REQ-10 · NFR-4 · Scenario: "Tentar login durante período de bloqueio"
**Depende de:** T-14 · T-32
**Concluída quando:** O scenario E2E passa com `npx cypress run`.

---

## REQ-12 — Desbloquear automaticamente após 15 minutos

> When the block period of 15 minutes expires, the system shall automatically unblock the identifier and reset its failed attempt counter.

### T-42: Implementar `DrizzleLoginAttemptRepository.removeBlock`

- [ ] Implementar o método `removeBlock(identifier)` no adapter `DrizzleLoginAttemptRepository`: remove o registro de bloqueio da tabela `login_blocks` para o `identifier` informado.

**Rastreabilidade:** REQ-12
**Depende de:** T-25 · T-26
**Concluída quando:** Após `removeBlock("alice")`, `findActiveBlock("alice")` retorna `null`.

---

### T-43: Implementar `DrizzleLoginAttemptRepository.resetFailureCount`

- [ ] Implementar o método `resetFailureCount(identifier)` no adapter `DrizzleLoginAttemptRepository`: remove os registros de tentativas falhas na tabela `login_attempts` para o `identifier` informado, zerando o contador efetivo da janela deslizante.

**Rastreabilidade:** REQ-12
**Depende de:** T-25 · T-26
**Concluída quando:** Após `resetFailureCount("alice")`, `countRecentFailures("alice", 10)` retorna 0.

---

### T-44: Implementar remoção de bloqueio expirado no `AuthenticateUserUseCase`

- [ ] Expandir `AuthenticateUserUseCase.execute()` para: quando `findActiveBlock` retorna um bloqueio mas `LoginDomain.isBlocked` retorna `false` (expirado), chamar `removeBlock` e `resetFailureCount` antes de prosseguir com o fluxo normal de autenticação.

**Rastreabilidade:** REQ-12
**Depende de:** T-12 · T-31 · T-42 · T-43
**Concluída quando:** Após expiração do bloqueio, uma tentativa com credenciais válidas tem sucesso e o bloqueio é removido do banco.

---

### T-45: Cobrir UT-13 — `execute()` com bloqueio expirado

- [ ] Escrever teste unitário para `AuthenticateUserUseCase.execute()` quando `findActiveBlock` retorna bloqueio com `blocked_until < now`: verificar que o use case chama `removeBlock` e `resetFailureCount` antes de prosseguir com autenticação.

**Rastreabilidade:** REQ-12 · Scenario: "Desbloquear automaticamente após 15 minutos"
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

### T-46: Cobrir E2E — Scenario "Desbloquear automaticamente após 15 minutos"

- [ ] Implementar steps Cypress/Cucumber para o scenario GH-8: dado que o bloqueio do identificador "alice" expirou, tentar login com senha válida e verificar que o sistema remove o bloqueio, reseta o contador e autentica o usuário com sucesso.

**Rastreabilidade:** REQ-12 · Scenario: "Desbloquear automaticamente após 15 minutos"
**Depende de:** T-14 · T-44
**Concluída quando:** O scenario E2E passa com `npx cypress run`.

---

## REQ-13 — Registrar toda tentativa de autenticação

> The system shall record every authentication attempt, whether successful or failed, in a structured log including the timestamp and the identifier used.

### T-47: Implementar log estruturado JSON em todas as tentativas de autenticação

- [ ] No `AuthenticateUserUseCase`, após cada tentativa de autenticação (bem-sucedida ou falha), emitir log estruturado em JSON via OpenTelemetry/Loki com os campos: `timestamp`, `identifier`, `success` (boolean), `requestId`. Obrigatório conforme constitution.md regra 6.

**Rastreabilidade:** REQ-13 · NFR-7
**Depende de:** T-12
**Concluída quando:** Toda tentativa gera uma entrada de log estruturado JSON com os campos obrigatórios, verificável nos logs do Loki/Jaeger em ambiente de desenvolvimento.

---

### T-48: Cobrir IT-3 — `LoginAttemptRepository.save`

- [ ] Escrever teste de integração para `DrizzleLoginAttemptRepository.save`: inserir uma tentativa bem-sucedida e uma fracassada e verificar que ambas aparecem na tabela `login_attempts` com `identifier`, `success` e `created_at` corretos.

**Rastreabilidade:** REQ-13 · NFR-7
**Depende de:** —
**Concluída quando:** Teste de integração passa com `npm run test`.

---

## REQ-14 — Enviar email de aviso para senha incorreta de conta existente

> If an authentication attempt uses an identifier that matches an existing account but the password is incorrect, the system shall send a warning notification to the email address registered to that account.

### T-49: Criar interface `EmailNotificationPort` (Port outbound)

- [ ] Definir a interface `EmailNotificationPort` na camada Domain com o método `sendLoginWarning(toEmail: string): Promise<void>`. A interface abstrai o mecanismo de envio concreto, mantendo o Domain desacoplado do Nodemailer/SMTP.

**Rastreabilidade:** REQ-14 · NFR-8
**Depende de:** —
**Concluída quando:** A interface existe no Domain sem importações externas e o `AuthenticateUserUseCase` pode depender dela via injeção.

---

### T-50: Implementar `EmailNotificationAdapter` com `sendLoginWarning` via Nodemailer/Mailhog

- [ ] Implementar o adapter `EmailNotificationAdapter` na camada de infraestrutura, concretizando `EmailNotificationPort`. O método `sendLoginWarning` envia email de aviso de tentativa falha via Nodemailer com SMTP configurado para Mailhog em desenvolvimento. O envio é fire-and-forget (assíncrono sem await no caller) conforme DT-4.

**Rastreabilidade:** REQ-14 · NFR-8
**Depende de:** T-49
**Concluída quando:** O adapter envia email para o endereço informado via Mailhog em desenvolvimento, verificável na interface web do Mailhog.

---

### T-51: Implementar `LoginDomain.shouldSendEmailWarning`

- [ ] Implementar o método `shouldSendEmailWarning(userExists: boolean, passwordCorrect: boolean): boolean` em `LoginDomain`: retorna `true` somente quando `userExists = true` AND `passwordCorrect = false`. Sem dependências externas.

**Rastreabilidade:** REQ-14 · NFR-8
**Depende de:** T-31
**Concluída quando:** O método retorna `true` apenas para conta existente + senha incorreta; retorna `false` para conta inexistente + qualquer senha.

---

### T-52: Integrar envio de email no `AuthenticateUserUseCase`

- [ ] Expandir `AuthenticateUserUseCase.execute()` para: quando a senha estiver incorreta e o usuário existir (`LoginDomain.shouldSendEmailWarning` retornar `true`), chamar `EmailNotificationPort.sendLoginWarning(user.email)` de forma fire-and-forget. Falhas no envio devem ser logadas mas não propagadas como erro (DT-4).

**Rastreabilidade:** REQ-14 · NFR-8
**Depende de:** T-12 · T-49 · T-51
**Concluída quando:** Tentativa com senha incorreta para conta existente dispara envio de email de forma assíncrona; falha no envio não bloqueia a resposta HTTP.

---

### T-53: Cobrir UT-5 — `LoginDomain.shouldSendEmailWarning()`

- [ ] Escrever testes unitários para `LoginDomain.shouldSendEmailWarning()`: (a) retorna `true` quando usuário existe e senha incorreta, (b) retorna `false` quando usuário não existe, (c) retorna `false` quando senha correta.

**Rastreabilidade:** REQ-14 · NFR-8
**Depende de:** —
**Concluída quando:** Os 3 casos passam com `npm run test`.

---

### T-54: Cobrir UT-6 — `execute()` dispara email apenas para conta existente com senha incorreta

- [ ] Escrever teste unitário para `AuthenticateUserUseCase.execute()`: (a) verificar que `EmailNotificationPort.sendLoginWarning` é chamado quando usuário existe e senha incorreta; (b) verificar que não é chamado quando usuário não existe; (c) verificar que não bloqueia a resposta HTTP mesmo se o adapter lançar exceção.

**Rastreabilidade:** REQ-14 · NFR-8 · Scenario: "Email de aviso para senha incorreta"
**Depende de:** —
**Concluída quando:** Os 3 casos passam com `npm run test`.

---

### T-55: Cobrir IT-6 — `EmailNotificationAdapter.sendLoginWarning`

- [ ] Escrever teste de integração para `EmailNotificationAdapter.sendLoginWarning`: chamar o método com um endereço de teste e verificar que o email é recebido no Mailhog (via API do Mailhog ou inspeção direta).

**Rastreabilidade:** REQ-14 · NFR-8
**Depende de:** —
**Concluída quando:** Teste de integração passa com `npm run test` com Mailhog em execução via Docker.

---

### T-56: Cobrir E2E — Scenario "Email de aviso para senha incorreta"

- [ ] Implementar steps Cypress/Cucumber para o scenario GH-9: submeter formulário com identificador válido e senha incorreta, verificar que o email de aviso é enviado para o endereço cadastrado (via Mailhog), a mensagem "Usuário ou senha incorretos" é exibida e o usuário permanece na página de login.

**Rastreabilidade:** REQ-14 · NFR-8 · Scenario: "Email de aviso para senha incorreta"
**Depende de:** T-14 · T-52
**Concluída quando:** O scenario E2E passa com `npx cypress run`.

---

## Testes Unitários complementares

### T-57: Cobrir UT-6 — `execute()` login bem-sucedido por username

- [ ] Escrever teste unitário para `AuthenticateUserUseCase.execute()` no caminho feliz com username: sem bloqueio ativo, usuário encontrado com status `active`, senha correta — verificar que o use case retorna `{ id, username, email }`.

**Rastreabilidade:** REQ-2 · REQ-3 · REQ-13
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

### T-58: Cobrir UT-7 — `execute()` login bem-sucedido por email

- [ ] Escrever teste unitário para `AuthenticateUserUseCase.execute()` usando endereço de email como `identifier`: `UserRepository.findByIdentifier` busca pelo campo `email` — verificar que o use case retorna `{ id, username, email }`.

**Rastreabilidade:** REQ-2 · REQ-3
**Depende de:** —
**Concluída quando:** Teste unitário passa com `npm run test`.

---

## Testes de Integração complementares

### T-59: Cobrir IT-1 — `UserRepository.findByIdentifier` por username

- [ ] Escrever teste de integração para `DrizzleUserRepository.findByIdentifier` por username: (a) usuário `active` retornado corretamente, (b) username inexistente retorna `null`, (c) usuário com `status = pending` retorna `null`.

**Rastreabilidade:** REQ-2 · REQ-5
**Depende de:** —
**Concluída quando:** Os 3 casos passam com `npm run test`.

---

### T-60: Cobrir IT-2 — `UserRepository.findByIdentifier` por email

- [ ] Escrever teste de integração para `DrizzleUserRepository.findByIdentifier` por email: (a) usuário `active` encontrado pelo campo `email` retornado corretamente, (b) email inexistente retorna `null`.

**Rastreabilidade:** REQ-2
**Depende de:** —
**Concluída quando:** Os 2 casos passam com `npm run test`.

---

## NFRs sem REQ direto — Performance e Segurança

### T-61: Cobrir PT-1 — Latência de autenticação bem-sucedida (k6)

- [ ] Criar script k6 que envia 100 req/s de `POST /api/auth/callback/credentials` com credenciais válidas durante 60 segundos e verifica que p95 da latência é menor ou igual a 2000 ms.

**Rastreabilidade:** NFR-1
**Depende de:** T-14
**Concluída quando:** Script k6 passa o threshold p95 ≤ 2000ms com `k6 run`.

---

### T-62: Cobrir PT-2 — Latência de redirecionamento pós-autenticação (k6)

- [ ] Criar script k6 que mede o tempo entre a resposta de autenticação bem-sucedida e o recebimento do redirect para `/users/<id>` e verifica que p95 é menor ou igual a 500 ms.

**Rastreabilidade:** NFR-2
**Depende de:** T-14 · T-15
**Concluída quando:** Script k6 passa o threshold p95 ≤ 500ms com `k6 run`.

---

### T-63: Cobrir PT-3 — SLA de entrega do email de aviso

- [ ] Implementar verificação automatizada que registra o timestamp da requisição de login com senha incorreta e consulta a API do Mailhog em intervalos de 30 segundos, verificando que o email de aviso é entregue em até 5 minutos.

**Rastreabilidade:** NFR-8
**Depende de:** T-52
**Concluída quando:** 10 execuções consecutivas confirmam que o email chega dentro do SLA de 5 minutos.

---

### T-64: Cobrir ST-1 a ST-5 — Testes de segurança

- [ ] Implementar os 5 testes de segurança descritos na `test-strategy.md`: ST-1 (bloqueio após 3 falhas), ST-2 (mensagem genérica uniforme), ST-3 (timing attack — latência similar para conta existente e inexistente), ST-4 (sessão inválida rejeitada), ST-5 (log estruturado em todas as tentativas). Cada caso pode ser implementado como teste de integração ou E2E conforme a natureza da verificação.

**Rastreabilidade:** NFR-3 · NFR-4 · NFR-5 · NFR-6 · NFR-7
**Depende de:** T-14 · T-32 · T-47
**Concluída quando:** Os 5 cenários de segurança passam nos testes automatizados.

# Estratégia de Testes — Login

## 1. Testes Unitários

### UT-1: LoginDomain.verifyPassword()

- **O que testa:** Comparação de senha em texto plano contra hash bcrypt
- **Casos cobertos:**
    - Caminho feliz: senha correta retorna `true`
    - Senha incorreta: retorna `false`
    - Hash inválido ou corrompido: lança erro de autenticação
- **Mocks necessários:** nenhum — domínio puro (bcrypt é utilitário puro de hash)
- **Rastreabilidade:** REQ-2 · REQ-5

---

### UT-2: LoginDomain.isBlocked()

- **O que testa:** Avaliação se um bloqueio está vigente com base em `blocked_until`
- **Casos cobertos:**
    - `blocked_until > now`: retorna `true` (bloqueio ativo)
    - `blocked_until < now`: retorna `false` (bloqueio expirado)
    - `blocked_until = null/undefined`: retorna `false` (sem bloqueio registrado)
- **Mocks necessários:** nenhum — domínio puro (recebe timestamp como parâmetro)
- **Rastreabilidade:** REQ-11 · REQ-12

---

### UT-3: LoginDomain.shouldActivateBlock()

- **O que testa:** Avaliação se o contador de falhas atingiu o limite de 3 na janela de 10 minutos
- **Casos cobertos:**
    - 3 falhas na janela de 10 min: retorna `true`
    - 2 falhas na janela de 10 min: retorna `false`
    - 0 falhas: retorna `false`
    - 4 falhas (acima do limite): retorna `true`
- **Mocks necessários:** nenhum — domínio puro
- **Rastreabilidade:** REQ-8 · REQ-9 · NFR-3

---

### UT-4: LoginDomain.calculateBlockExpiration()

- **O que testa:** Cálculo da data de expiração do bloqueio (now + 15 minutos)
- **Casos cobertos:**
    - Caminho feliz: retorna timestamp igual a `agora + 15 minutos`
    - Caso de borda: valor retornado não pode ser menor que `now + 15 min`
- **Mocks necessários:** nenhum — domínio puro (recebe `now` como parâmetro)
- **Rastreabilidade:** REQ-9 · NFR-4

---

### UT-5: LoginDomain.shouldSendEmailWarning()

- **O que testa:** Determina se notificação de email deve ser enviada após falha de autenticação
- **Casos cobertos:**
    - Usuário existe e senha incorreta: retorna `true`
    - Usuário não existe: retorna `false`
    - Usuário existe e senha correta: retorna `false` (login bem-sucedido, sem aviso)
- **Mocks necessários:** nenhum — domínio puro (recebe flags como parâmetros)
- **Rastreabilidade:** REQ-14 · NFR-8

---

### UT-6: AuthenticateUserUseCase.execute() — login bem-sucedido por username

- **O que testa:** Orquestração do fluxo completo de autenticação com credenciais válidas usando username
- **Casos cobertos:**
    - Caminho feliz: sem bloqueio ativo, usuário encontrado com status `active`, senha correta — retorna objeto de sessão com `{ id, username, email }`
- **Mocks necessários:** `UserRepository.findByIdentifier` (retorna usuário ativo), `LoginAttemptRepository.findActiveBlock` (retorna `null`), `LoginAttemptRepository.countRecentFailures` (retorna `0`), `LoginAttemptRepository.save`
- **Rastreabilidade:** REQ-2 · REQ-3 · REQ-13

---

### UT-7: AuthenticateUserUseCase.execute() — login bem-sucedido por email

- **O que testa:** Autenticação usando endereço de email como identificador
- **Casos cobertos:**
    - Caminho feliz: `identifier` no formato de email, `UserRepository.findByIdentifier` busca por campo `email` — retorna objeto de sessão
- **Mocks necessários:** idem UT-6 (com `identifier` = email)
- **Rastreabilidade:** REQ-2 · REQ-3

---

### UT-8: AuthenticateUserUseCase.execute() — identificador vazio

- **O que testa:** Rejeição de `identifier` vazio antes de qualquer consulta ao repositório
- **Casos cobertos:**
    - `identifier = ""`: lança erro de autenticação com mensagem genérica; nenhuma consulta ao `UserRepository` deve ser realizada
- **Mocks necessários:** `LoginAttemptRepository` e `UserRepository` (verificar que NÃO são chamados)
- **Rastreabilidade:** REQ-6 · NFR-6

---

### UT-9: AuthenticateUserUseCase.execute() — usuário inexistente

- **O que testa:** Rejeição quando identifier não corresponde a nenhuma conta cadastrada
- **Casos cobertos:**
    - `UserRepository.findByIdentifier` retorna `null`: lança erro de autenticação genérico
    - `EmailNotificationAdapter` não deve ser chamado (conta não existe)
    - `LoginAttemptRepository.save` deve ser chamado com `success: false`
- **Mocks necessários:** `UserRepository.findByIdentifier` (retorna `null`), `LoginAttemptRepository.findActiveBlock` (retorna `null`), `LoginAttemptRepository.save`, `EmailNotificationAdapter` (verificar que NÃO é chamado)
- **Rastreabilidade:** REQ-5 · REQ-13 · REQ-14 · NFR-6

---

### UT-10: AuthenticateUserUseCase.execute() — senha incorreta

- **O que testa:** Rejeição com usuário existente mas senha incorreta, e disparo de notificação de email
- **Casos cobertos:**
    - Senha incorreta: lança erro de autenticação genérico
    - `EmailNotificationAdapter.sendWarning` deve ser chamado com o email do usuário
    - `LoginAttemptRepository.save` deve ser chamado com `success: false`
- **Mocks necessários:** `UserRepository.findByIdentifier` (retorna usuário ativo), `LoginAttemptRepository.findActiveBlock` (retorna `null`), `LoginAttemptRepository.save`, `EmailNotificationAdapter.sendWarning` (verificar que É chamado)
- **Rastreabilidade:** REQ-5 · REQ-13 · REQ-14 · NFR-6 · NFR-8

---

### UT-11: AuthenticateUserUseCase.execute() — bloqueio ativo

- **O que testa:** Rejeição imediata quando identifier está bloqueado, sem verificar credenciais
- **Casos cobertos:**
    - `LoginAttemptRepository.findActiveBlock` retorna bloqueio com `blocked_until > now`: lança erro `429`; `UserRepository.findByIdentifier` não deve ser chamado
- **Mocks necessários:** `LoginAttemptRepository.findActiveBlock` (retorna bloqueio ativo), `UserRepository` (verificar que NÃO é chamado)
- **Rastreabilidade:** REQ-11 · REQ-10 · NFR-3 · NFR-4

---

### UT-12: AuthenticateUserUseCase.execute() — ativar bloqueio após 3 falhas

- **O que testa:** Criação de registro de bloqueio quando o contador de falhas atinge o limite na janela de 10 minutos
- **Casos cobertos:**
    - `countRecentFailures` retorna `3`: `createBlock` deve ser chamado com `blocked_until = now + 15min`; lança erro de bloqueio após criar o registro
- **Mocks necessários:** `LoginAttemptRepository.findActiveBlock` (retorna `null`), `LoginAttemptRepository.countRecentFailures` (retorna `3`), `LoginAttemptRepository.createBlock` (verificar que É chamado com timestamp correto), `UserRepository`
- **Rastreabilidade:** REQ-8 · REQ-9 · NFR-3 · NFR-4

---

### UT-13: AuthenticateUserUseCase.execute() — desbloquear após expiração

- **O que testa:** Remoção do bloqueio expirado e reset do contador de falhas antes de prosseguir com autenticação
- **Casos cobertos:**
    - `findActiveBlock` retorna bloqueio com `blocked_until < now`: `removeBlock` e `resetFailureCount` são chamados; fluxo continua como login normal
- **Mocks necessários:** `LoginAttemptRepository.findActiveBlock` (retorna bloqueio expirado), `LoginAttemptRepository.removeBlock` (verificar que É chamado), `LoginAttemptRepository.resetFailureCount` (verificar que É chamado), `UserRepository`
- **Rastreabilidade:** REQ-12 · NFR-4

---

## 2. Testes de Integração

### IT-1: UserRepository — findByIdentifier por username

- **O que testa:** Busca de usuário pelo campo `username` com status `active` via banco de teste real
- **Dependências reais usadas:** MySQL de teste
- **Casos cobertos:**
    - Usuário com `status = active` encontrado por `username`: retorna objeto com `id`, `username`, `email`, `password_hash`
    - `username` não existe: retorna `null`
    - Usuário existe mas `status = pending`: retorna `null`
- **Setup necessário:** inserir um usuário com `status = active` e outro com `status = pending` no banco de teste antes do teste; remover após
- **Rastreabilidade:** REQ-2 · REQ-5

---

### IT-2: UserRepository — findByIdentifier por email

- **O que testa:** Busca de usuário pelo campo `email` com status `active`
- **Dependências reais usadas:** MySQL de teste
- **Casos cobertos:**
    - Usuário com `status = active` encontrado por `email`: retorna objeto correto
    - `email` não existe: retorna `null`
- **Setup necessário:** inserir usuário com email e `status = active` no banco de teste
- **Rastreabilidade:** REQ-2

---

### IT-3: LoginAttemptRepository — save

- **O que testa:** Persistência de tentativa de autenticação com `timestamp`, `identifier` e resultado (`success`)
- **Dependências reais usadas:** MySQL de teste
- **Casos cobertos:**
    - `save` com `success: true`: registro inserido com `timestamp` e `identifier` corretos
    - `save` com `success: false`: registro inserido com `success = false`
- **Setup necessário:** banco limpo para o `identifier` de teste; verificar após `save` que o registro existe na tabela `login_attempts`
- **Rastreabilidade:** REQ-13 · NFR-7

---

### IT-4: LoginAttemptRepository — countRecentFailures

- **O que testa:** Contagem de falhas na janela deslizante de 10 minutos por identifier
- **Dependências reais usadas:** MySQL de teste
- **Casos cobertos:**
    - 3 registros `failure` nos últimos 10 min: retorna `3`
    - 1 registro `failure` há mais de 10 min + 2 recentes: retorna `2` (apenas os dentro da janela)
    - 0 registros: retorna `0`
- **Setup necessário:** inserir registros com `created_at` manipulados — alguns dentro e alguns fora da janela de 10 minutos
- **Rastreabilidade:** REQ-8 · NFR-3

---

### IT-5: LoginAttemptRepository — ciclo completo de bloqueio

- **O que testa:** Criação, consulta, expiração e remoção de bloqueios, e reset do contador de falhas
- **Dependências reais usadas:** MySQL de teste
- **Casos cobertos:**
    - `createBlock`: cria registro de bloqueio com `blocked_until = now + 15min`
    - `findActiveBlock` com `blocked_until > now`: retorna o bloqueio ativo
    - `findActiveBlock` com `blocked_until < now`: retorna `null` (bloqueio expirado)
    - `removeBlock`: remove o registro de bloqueio do banco
    - `resetFailureCount`: remove registros de `failure` do `identifier` na tabela `login_attempts`
- **Setup necessário:** banco limpo para o `identifier` de teste; manipular `blocked_until` via inserção direta para simular expiração
- **Rastreabilidade:** REQ-9 · REQ-11 · REQ-12 · NFR-4

---

### IT-6: EmailNotificationAdapter — sendWarning

- **O que testa:** Envio de email de aviso via servidor SMTP de teste (Mailhog)
- **Dependências reais usadas:** Mailhog (SMTP de teste)
- **Casos cobertos:**
    - `sendWarning` com email válido: email entregue ao Mailhog e verificável via API REST do Mailhog (`GET /api/v2/messages`)
    - SMTP indisponível: falha é capturada e logada sem propagar exceção para o caller (comportamento fire-and-forget — DT-3)
- **Setup necessário:** Mailhog rodando via Docker Compose no ambiente de teste; limpar inbox (`DELETE /api/v1/messages`) antes de cada execução
- **Rastreabilidade:** REQ-14 · NFR-8

---

## 3. Testes E2E Gherkin

### GH-1: Scenario "Login bem-sucedido com usuário"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário "alice" existe com senha válida` → criar usuário `alice` com status `active` e senha conhecida no banco de teste
    - `When o usuário preenche o formulário com "alice" como identificador e a senha correta` → preencher campo `identifier` com `"alice"` e campo `password` com a senha cadastrada
    - `And clica no botão de login` → submeter o formulário de login (reutilizável em múltiplos cenários)
    - `Then o sistema cria uma sessão autenticada` → verificar que a sessão next-auth foi criada (cookie de sessão presente na resposta)
    - `And o usuário é redirecionado para sua área pessoal` → verificar que a URL final é `/users/<id-do-alice>`
- **Steps reutilizáveis de outros Scenarios:** `And clica no botão de login` (reutilizado em GH-2, GH-4, GH-5, GH-7, GH-8)
- **Estado inicial necessário:** usuário `alice` com `status = active` e `password_hash` correspondente à senha de teste inserido no banco
- **Rastreabilidade:** REQ-1 · REQ-2 · REQ-3 · REQ-4

---

### GH-2: Scenario "Login bem-sucedido com email"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário com email "alice@example.com" existe com senha válida` → criar usuário com `email = "alice@example.com"`, `status = active` e senha conhecida
    - `When o usuário preenche o formulário com "alice@example.com" como identificador e a senha correta` → preencher `identifier` com `"alice@example.com"` e `password` com senha cadastrada
    - `And clica no botão de login` → reutilizar step de GH-1
    - `Then o sistema cria uma sessão autenticada` → reutilizar step de GH-1
    - `And o usuário é redirecionado para sua área pessoal` → reutilizar step de GH-1
- **Steps reutilizáveis de outros Scenarios:** `And clica no botão de login`, `Then o sistema cria uma sessão autenticada`, `And o usuário é redirecionado para sua área pessoal` (de GH-1)
- **Estado inicial necessário:** usuário com `email = "alice@example.com"` e `status = active` inserido no banco
- **Rastreabilidade:** REQ-2 · REQ-3 · REQ-4

---

### GH-3: Scenario "Login com identificador vazio"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `When o usuário tenta fazer login sem preencher o campo de identificador` → deixar campo `identifier` vazio; preencher `password` com qualquer valor
    - `And clica no botão de login` → reutilizar step de GH-1
    - `Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"` → verificar que a mensagem `"Usuário ou senha incorretos"` está visível na página (reutilizável)
    - `And o usuário permanece na página de login` → verificar que a URL atual é a página de login (reutilizável)
- **Steps reutilizáveis de outros Scenarios:** `Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"` e `And o usuário permanece na página de login` (reutilizados em GH-4, GH-5)
- **Estado inicial necessário:** nenhum dado no banco necessário
- **Rastreabilidade:** REQ-6 · REQ-7 · NFR-6

---

### GH-4: Scenario "Login com senha incorreta"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário "alice" existe` → criar usuário `alice` com `status = active` no banco
    - `When o usuário preenche o formulário com "alice" como identificador e uma senha incorreta` → preencher `identifier = "alice"` e `password` com valor que não corresponde ao hash
    - `And clica no botão de login` → reutilizar step de GH-1
    - `Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"` → reutilizar step de GH-3
    - `And o usuário permanece na página de login` → reutilizar step de GH-3
- **Steps reutilizáveis de outros Scenarios:** `Given que o usuário "alice" existe` (reutilizado em GH-6, GH-9), `And clica no botão de login`, mensagem de erro e permanência na página
- **Estado inicial necessário:** usuário `alice` com `status = active` inserido no banco; nenhum bloqueio ativo
- **Rastreabilidade:** REQ-5 · REQ-7 · NFR-6

---

### GH-5: Scenario "Login com usuário inexistente"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `When o usuário preenche o formulário com um identificador que não existe` → preencher `identifier` com valor garantidamente ausente no banco (ex: `"usuario_inexistente_xyz"`) e qualquer `password`
    - `And clica no botão de login` → reutilizar step de GH-1
    - `Then o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"` → reutilizar step de GH-3
    - `And o usuário permanece na página de login` → reutilizar step de GH-3
- **Steps reutilizáveis de outros Scenarios:** steps de erro e permanência na página
- **Estado inicial necessário:** banco sem o identificador utilizado no teste
- **Rastreabilidade:** REQ-5 · REQ-7 · NFR-6

---

### GH-6: Scenario "Bloquear após 3 tentativas erradas em 10 minutos"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário "alice" realizou 3 tentativas de login fracassadas nos últimos 10 minutos` → inserir diretamente 3 registros em `login_attempts` com `identifier = "alice"`, `success = false` e `created_at` dentro dos últimos 10 minutos
    - `When o usuário tenta fazer login novamente` → submeter formulário com `identifier = "alice"` e qualquer senha
    - `Then o sistema exibe mensagem de bloqueio "Muitas tentativas fracassadas. Tente novamente em 15 minutos"` → verificar que a mensagem de bloqueio está visível (reutilizável em GH-7)
    - `And o identificador "alice" é bloqueado por 15 minutos` → verificar registro em `login_blocks` com `blocked_until` aproximadamente igual a `now + 15min`
    - `And o usuário não consegue fazer login` → verificar que nenhuma sessão foi criada e URL permanece na página de login (reutilizável em GH-7)
- **Steps reutilizáveis de outros Scenarios:** mensagem de bloqueio e `And o usuário não consegue fazer login` (reutilizados em GH-7)
- **Estado inicial necessário:** usuário `alice` com `status = active`; 3 registros de falha recentes em `login_attempts`; nenhum bloqueio ativo em `login_blocks`
- **Rastreabilidade:** REQ-8 · REQ-9 · REQ-10 · REQ-11 · NFR-3 · NFR-4

---

### GH-7: Scenario "Tentar login durante período de bloqueio"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o identificador "alice" está bloqueado por tentativas erradas` → inserir registro em `login_blocks` com `identifier = "alice"` e `blocked_until = now + 10min`
    - `When o usuário tenta fazer login com "alice"` → preencher `identifier = "alice"` e qualquer `password`
    - `And clica no botão de login` → reutilizar step de GH-1
    - `Then o sistema exibe mensagem de bloqueio "Muitas tentativas fracassadas. Tente novamente em 15 minutos"` → reutilizar step de GH-6
    - `And o usuário não consegue fazer login` → reutilizar step de GH-6
- **Steps reutilizáveis de outros Scenarios:** mensagem de bloqueio, bloqueio ativo e não consegue fazer login (de GH-6)
- **Estado inicial necessário:** registro em `login_blocks` com `blocked_until > now` para `"alice"`
- **Rastreabilidade:** REQ-11 · REQ-10 · NFR-3 · NFR-4

---

### GH-8: Scenario "Desbloquear automaticamente após 15 minutos"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o identificador "alice" está bloqueado e o período de 15 minutos expirou` → inserir registro em `login_blocks` com `blocked_until = now - 1min` (já expirado); inserir usuário `alice` com `status = active`
    - `When o usuário tenta fazer login com "alice" e uma senha válida` → preencher `identifier = "alice"` e senha correta
    - `And clica no botão de login` → reutilizar step de GH-1
    - `Then o sistema remove o bloqueio` → verificar que o registro em `login_blocks` para `"alice"` foi removido
    - `And o sistema reseta o contador de tentativas fracassadas` → verificar que não existem registros `failure` em `login_attempts` para `"alice"` (ou que `countRecentFailures` retorna `0`)
    - `And o usuário consegue fazer login com sucesso` → verificar que a sessão foi criada e o usuário foi redirecionado para `/users/<id>`
- **Steps reutilizáveis de outros Scenarios:** `And clica no botão de login`; `And o usuário consegue fazer login com sucesso` (variação de GH-1)
- **Estado inicial necessário:** registro `login_blocks` com `blocked_until < now`; usuário `alice` com `status = active`; mecanismo de forçar expiração: inserção direta com `blocked_until` no passado
- **Rastreabilidade:** REQ-12 · REQ-2 · REQ-3 · REQ-4 · NFR-4

---

### GH-9: Scenario "Email de aviso para senha incorreta"

- **Arquivo:** `docs/features/login/scenarios.feature`
- **Step definitions necessários:**
    - `Given que o usuário "alice" existe com email "alice@example.com" cadastrado` → criar usuário `alice` com `email = "alice@example.com"`, `status = active` e senha conhecida
    - `When o usuário preenche o formulário com "alice" como identificador e uma senha incorreta` → preencher `identifier = "alice"` e `password` incorreto
    - `And clica no botão de login` → reutilizar step de GH-1
    - `Then o sistema envia um email de aviso para "alice@example.com" alertando sobre a tentativa de login falhada` → aguardar até 5 minutos; consultar `GET /api/v2/messages` do Mailhog e verificar que existe email para `"alice@example.com"` com assunto de aviso de tentativa de login
    - `And o sistema exibe mensagem de erro genérica "Usuário ou senha incorretos"` → reutilizar step de GH-3
    - `And o usuário permanece na página de login` → reutilizar step de GH-3
- **Steps reutilizáveis de outros Scenarios:** `And clica no botão de login`, mensagem de erro, permanência na página
- **Estado inicial necessário:** usuário `alice` com `email = "alice@example.com"` e `status = active`; Mailhog disponível com inbox limpa
- **Rastreabilidade:** REQ-14 · REQ-5 · REQ-7 · NFR-8

---

## 4. Testes de Performance

### PT-1: Latência de autenticação bem-sucedida (p95)

- **O que mede:** Latência da requisição `POST /api/auth/callback/credentials` com credenciais válidas, do recebimento da requisição até a resposta com sessão criada
- **Threshold:** p95 ≤ 2000ms
- **Método de medição:** teste de carga com k6 — ramp-up progressivo até carga sustentada
- **Número de execuções:** 100 requisições por segundo durante 60 segundos; medir p95 sobre o total de requisições bem-sucedidas
- **Rastreabilidade:** NFR-1

---

### PT-2: Latência de redirecionamento pós-autenticação (p95)

- **O que mede:** Tempo entre a conclusão da autenticação bem-sucedida e o recebimento da resposta de redirecionamento para `/users/<id>` pelo cliente
- **Threshold:** p95 ≤ 500ms
- **Método de medição:** k6 com medição do tempo de resposta do redirect (status 302 + `Location` header) após a autenticação
- **Número de execuções:** 100 requisições por segundo durante 60 segundos; medir p95 do tempo de resposta do redirect
- **Rastreabilidade:** NFR-2

---

### PT-3: SLA de entrega de email de aviso

- **O que mede:** Tempo entre a tentativa de login com senha incorreta (resposta HTTP retornada) e a entrega do email de aviso no servidor SMTP (Mailhog)
- **Threshold:** email entregue em até 5 minutos após a tentativa fracassada
- **Método de medição:** medição em CI — registrar timestamp da requisição de login; consultar Mailhog API (`GET /api/v2/messages`) em intervalos de 30 segundos até receber o email ou atingir 5 minutos
- **Número de execuções:** 10 execuções para garantir consistência do comportamento fire-and-forget (DT-3)
- **Rastreabilidade:** NFR-8

---

## 5. Testes de Segurança

### ST-1: Bloqueio por força bruta — rate limiting ativo após 3 falhas

- **O que verifica:** O sistema bloqueia o identificador após exatamente 3 tentativas fracassadas em uma janela de 10 minutos, impedindo tentativas subsequentes independente da senha fornecida
- **Vetor de ataque simulado:** brute force — envio de múltiplas requisições consecutivas com senhas diferentes para o mesmo `identifier`
- **Casos cobertos:**
    - 3 requisições com senha incorreta em sequência: a 4ª requisição deve retornar HTTP `429` com mensagem `"Muitas tentativas fracassadas. Tente novamente em 15 minutos"`
    - A 4ª requisição com a senha correta também deve retornar `429` (bloqueio independe das credenciais)
    - Requisição com `identifier` diferente (não bloqueado) após bloqueio: deve retornar `401` normalmente (bloqueio é por identificador, não global)
- **Rastreabilidade:** NFR-3 · NFR-4 · REQ-8 · REQ-9 · REQ-11 · Risco "Tentativas repetidas de login" (PRD)

---

### ST-2: Enumeração de contas por resposta diferenciada

- **O que verifica:** O sistema retorna a mesma mensagem de erro (`"Usuário ou senha incorretos"`) e o mesmo status HTTP (`401`) para todos os casos de falha — sem diferenciar entre usuário inexistente, senha incorreta ou conta inativa
- **Vetor de ataque simulado:** enumeração de contas — análise das respostas do servidor para inferir se um `identifier` corresponde a uma conta existente
- **Casos cobertos:**
    - `identifier` inexistente + senha qualquer: HTTP `401`, mensagem `"Usuário ou senha incorretos"`
    - `identifier` existente + senha incorreta: HTTP `401`, mesma mensagem `"Usuário ou senha incorretos"`
    - `identifier` existente com `status = pending` + senha qualquer: HTTP `401`, mesma mensagem
    - Os três casos devem retornar respostas indistinguíveis (status, corpo, headers relevantes)
- **Rastreabilidade:** NFR-6 · REQ-5 · REQ-6 · Risco "Exposição de dados sensíveis em mensagens de erro" (PRD)

---

### ST-3: Timing attack — tempo de resposta uniforme entre falhas

- **O que verifica:** O tempo de resposta para tentativas fracassadas não varia de forma estatisticamente significativa entre `identifier` existente e inexistente — impedindo inferência de existência de conta por análise de latência
- **Vetor de ataque simulado:** timing attack — medição do tempo de resposta do endpoint para inferir se o `identifier` existe (usuário existente realiza bcrypt; inexistente retorna mais rápido)
- **Casos cobertos:**
    - Média e p95 de latência para `identifier` inexistente vs existente com senha incorreta: diferença deve ser ≤ 100ms na média (ou o sistema deve aplicar delay constante para equalizar)
    - Executar 50 requisições de cada tipo e comparar distribuições
- **Rastreabilidade:** NFR-6 · Risco "Exposição de dados sensíveis" (PRD)

---

### ST-4: Sessão inválida não autoriza acesso a recursos protegidos

- **O que verifica:** Requisições com token/cookie de sessão inválido, expirado ou adulterado para recursos protegidos são rejeitadas com HTTP `401` ou redirecionamento para login
- **Vetor de ataque simulado:** reuso ou forjamento de sessão — tentativa de acesso a `/users/<id>` com cookie de sessão manipulado, expirado ou ausente
- **Casos cobertos:**
    - Requisição sem cookie de sessão: redirecionado para a página de login
    - Requisição com cookie de sessão adulterado (valor inválido): HTTP `401` ou redirecionamento para login
    - Requisição com cookie de sessão expirado: HTTP `401` ou redirecionamento para login
- **Rastreabilidade:** NFR-5 · REQ-3 · Risco "Sessão inválida permitindo acesso indevido" (PRD)

---

### ST-5: Log estruturado de todas as tentativas de autenticação

- **O que verifica:** Toda tentativa de autenticação (bem-sucedida ou fracassada) gera entrada de log estruturado (JSON) com os campos obrigatórios: `timestamp`, `identifier`, `resultado (sucesso/falha)` e `requestId`
- **Vetor de ataque simulado:** ausência de auditoria — verificar que ataques não passam despercebidos nos logs
- **Casos cobertos:**
    - Login bem-sucedido: log gerado com `resultado = "success"`, `timestamp` e `identifier`
    - Login fracassado com senha incorreta: log gerado com `resultado = "failure"`, sem expor `password`
    - Tentativa com `identifier` inexistente: log gerado sem expor que a conta não existe
    - Tentativa bloqueada (429): log gerado registrando o bloqueio ativo
- **Rastreabilidade:** NFR-7 · REQ-13 · constitution.md regra 6

---

## Resumo de Cobertura

| Requisito | Unitário         | Integração       | E2E Gherkin       | Performance | Segurança |
| --------- | ---------------- | ---------------- | ----------------- | ----------- | --------- |
| REQ-1     | —                | —                | GH-1              | —           | —         |
| REQ-2     | UT-6, UT-7       | IT-1, IT-2       | GH-1, GH-2, GH-8  | —           | —         |
| REQ-3     | UT-6, UT-7       | —                | GH-1, GH-2, GH-8  | —           | ST-4      |
| REQ-4     | UT-6, UT-7       | —                | GH-1, GH-2, GH-8  | PT-2        | —         |
| REQ-5     | UT-9, UT-10      | IT-1             | GH-4, GH-5, GH-9  | —           | ST-2      |
| REQ-6     | UT-8             | —                | GH-3              | —           | ST-2      |
| REQ-7     | —                | —                | GH-3, GH-4, GH-5  | —           | —         |
| REQ-8     | UT-3, UT-12      | IT-4             | GH-6              | —           | ST-1      |
| REQ-9     | UT-4, UT-12      | IT-5             | GH-6              | —           | ST-1      |
| REQ-10    | UT-11, UT-12     | IT-5             | GH-6, GH-7        | —           | ST-1      |
| REQ-11    | UT-2, UT-11      | IT-5             | GH-7              | —           | ST-1      |
| REQ-12    | UT-13            | IT-5             | GH-8              | —           | —         |
| REQ-13    | UT-6, UT-9, UT-10 | IT-3            | —                 | —           | ST-5      |
| REQ-14    | UT-5, UT-9, UT-10 | IT-6            | GH-9              | PT-3        | —         |
| NFR-1     | —                | —                | —                 | PT-1        | —         |
| NFR-2     | —                | —                | —                 | PT-2        | —         |
| NFR-3     | UT-3, UT-12      | IT-4             | GH-6              | —           | ST-1      |
| NFR-4     | UT-4, UT-11, UT-13 | IT-5           | GH-6, GH-7, GH-8  | —           | ST-1      |
| NFR-5     | —                | —                | —                 | —           | ST-4      |
| NFR-6     | UT-8, UT-9, UT-10 | —               | GH-3, GH-4, GH-5  | —           | ST-2, ST-3 |
| NFR-7     | —                | IT-3             | —                 | —           | ST-5      |
| NFR-8     | UT-5, UT-10      | IT-6             | GH-9              | PT-3        | —         |

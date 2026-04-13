# Requisitos Funcionais — Login

## Fluxo Principal

**REQ-1**: When the user navigates to the login page, the system shall display a form with fields for identifier and password.

> Fonte: Fluxo Principal do PRD / Estoria 1, critério 1

**REQ-2**: When the user submits the login form with a valid identifier and matching password, the system shall authenticate the user.

> Fonte: Fluxo Principal do PRD / Cenários BDD "Login bem-sucedido com usuário" e "Login bem-sucedido com email" / Estoria 1, critério 2

**REQ-3**: When the user is successfully authenticated, the system shall create an authenticated session for the user.

> Fonte: Cenários BDD "Login bem-sucedido com usuário" e "Login bem-sucedido com email" / Estoria 1, critério 3

**REQ-4**: When the user is successfully authenticated, the system shall redirect the user to their personal area.

> Fonte: Fluxo Principal do PRD / Cenários BDD "Login bem-sucedido com usuário" e "Login bem-sucedido com email" / Estoria 1, critério 4

## Validação de Entrada

**REQ-5**: If the submitted credentials do not match any active account, the system shall reject the authentication attempt and display the generic message "Usuário ou senha incorretos".

> Fonte: Fluxo Alternativo "Credenciais inválidas" do PRD / Cenários BDD "Login com senha incorreta" e "Login com usuário inexistente" / Estoria 2, critérios 1 e 2

**REQ-6**: If the user submits the login form with an empty identifier field, the system shall reject the authentication attempt and display the generic message "Usuário ou senha incorretos".

> Fonte: Cenário BDD "Login com identificador vazio" / Estoria 2, critério 4

**REQ-7**: If the authentication attempt is rejected, the system shall keep the user on the login page.

> Fonte: Fluxo Alternativo "Credenciais inválidas" do PRD / Cenários BDD "Login com senha incorreta", "Login com identificador vazio", "Login com usuário inexistente" / Estoria 2, critério 2

## Proteção contra Força Bruta

**REQ-8**: The system shall allow a maximum of 3 failed authentication attempts per identifier within a 10-minute window.

> Fonte: Fluxo Alternativo "Proteção contra força bruta" do PRD / Cenário BDD "Bloquear após 3 tentativas erradas em 10 minutos" / Estoria 3, critério 1

**REQ-9**: If an identifier reaches 3 failed authentication attempts within a 10-minute window, the system shall block that identifier from further authentication attempts for 15 minutes.

> Fonte: Fluxo Alternativo "Proteção contra força bruta" do PRD / Cenário BDD "Bloquear após 3 tentativas erradas em 10 minutos" / Estoria 3, critério 3

**REQ-10**: If the identifier is blocked, the system shall display the message "Muitas tentativas fracassadas. Tente novamente em 15 minutos".

> Fonte: Cenários BDD "Bloquear após 3 tentativas erradas em 10 minutos" e "Tentar login durante período de bloqueio" / Estoria 3, critério 4

**REQ-11**: While an identifier is blocked, the system shall reject any authentication attempt for that identifier regardless of the credentials provided.

> Fonte: Cenário BDD "Tentar login durante período de bloqueio" / Estoria 3, critério 3

**REQ-12**: When the block period of 15 minutes expires, the system shall automatically unblock the identifier and reset its failed attempt counter.

> Fonte: Cenário BDD "Desbloquear automaticamente após 15 minutos" / Estoria 4, critérios 1, 2 e 3

## Registro e Notificação

**REQ-13**: The system shall record every authentication attempt, whether successful or failed, in a structured log including the timestamp and the identifier used.

> Fonte: Objetivo 5 do PRD / Estoria 3, critério 2

**REQ-14**: If an authentication attempt uses an identifier that matches an existing account but the password is incorrect, the system shall send a warning notification to the email address registered to that account.

> Fonte: Cenário BDD "Email de aviso para senha incorreta" / Estoria 2, critério 5

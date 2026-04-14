# Requisitos Funcionais — Registrar Usuário

## Navegação para o Cadastro

**REQ-1**: When the visitor clicks the registration link on the home page, the system shall redirect the browser to the registration page (`/register`).

> Fonte: Cenário BDD "Acessar formulario de cadastro via link na home" — When/Then principal / PRD — Fluxo Principal, passo 1

**REQ-2**: When the visitor accesses the registration page, the system shall display a form containing the following fields: full name, username, email address, password, password confirmation, date of birth, and profile photo (optional).

> Fonte: Cenário BDD "Acessar formulario de cadastro via link na home" — And "o sistema exibe um formulario" / Estória 1, critério de aceitação 1 (atualizado para incluir username) / PRD — Fluxo Principal, passo 1

## Fluxo Principal

**REQ-3**: When the visitor submits the registration form with all valid data, the system shall create a registration record with status "pending".

> Fonte: Cenário BDD "Cadastro realizado com dados validos" — Then principal / PRD — Fluxo Principal, passos 3 e 4 / PRD — Objetivos, item 3

**REQ-4**: When the visitor submits the registration form with all valid data, the system shall send an email containing a unique confirmation link, valid for 24 hours, to the provided email address.

> Fonte: Cenário BDD "Cadastro realizado com dados validos" — And "o sistema envia um email de confirmacao" / PRD — Fluxo Principal, passo 4 / PRD — Objetivos, item 4

**REQ-5**: When the visitor submits the registration form with all valid data, the system shall display a screen informing that a confirmation link has been sent to the registered email address.

> Fonte: Cenário BDD "Cadastro realizado com dados validos" — Then "o visitante ve uma tela informando que um link de confirmacao foi enviado" / Estória 1, critério de aceitação 4 / PRD — Fluxo Principal, passo 5

## Validação de Entrada

**REQ-6**: If any required field (full name, username, email address, password, password confirmation, or date of birth) is blank at form submission, the system shall block the submission and display an error message indicating which field is missing.

> Fonte: Cenário BDD "Cadastro com dados invalidos no formulario" — situações "nome em branco" e "data de nascimento em branco" / Estória 1, critério de aceitação 2 (atualizado para incluir username) / Estória 2, critério de aceitação 1

**REQ-7**: If the provided username is already associated with an existing account, the system shall reject the registration and display an error message indicating that the username is already in use.

> Fonte: Estória 2, critério de aceitação 1 (novo — username único entre todos os usuários)

**REQ-8**: If the provided email address is already associated with an existing account, the system shall reject the registration and display the message "Este email já está cadastrado. Tente fazer login ou use outro endereço."

> Fonte: Cenário BDD "Cadastro com dados invalidos no formulario" — situação "email já associado a uma conta existente" / Estória 2, critério de aceitação 2 / PRD — Objetivos, item 2

**REQ-9**: If the provided password does not meet the security policy (minimum 8 characters containing uppercase letters, lowercase letters, numbers, and special characters), the system shall reject the form submission and display the message "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais."

> Fonte: Cenário BDD "Cadastro com dados invalidos no formulario" — situação "senha sem caractere especial" / Estória 2, critério de aceitação 3 / PRD — Objetivos, item 2

**REQ-10**: If the password confirmation does not match the chosen password, the system shall reject the form submission and display the message "As senhas não coincidem."

> Fonte: Cenário BDD "Cadastro com dados invalidos no formulario" — situação "confirmação de senha diferente da senha informada" / Estória 2, critério de aceitação 4

**REQ-11**: If the provided email address is not in a valid format, the system shall reject the form submission and display the message "Informe um endereço de email válido."

> Fonte: Cenário BDD "Cadastro com dados invalidos no formulario" — situação "email com formato inválido" / Estória 2, critério de aceitação 2

**REQ-12**: If any validation error occurs during registration form submission, the system shall not create any registration record.

> Fonte: Cenário BDD "Cadastro com dados invalidos no formulario" — And "nenhum cadastro e criado" / Estória 2, critério de aceitação 5

## Confirmação de Conta

**REQ-13**: When the visitor accesses a valid confirmation link, the system shall activate the account by changing its status from "pending" to "active".

> Fonte: Cenário BDD "Confirmacao de conta via link valido" / PRD — Fluxo Principal, passos 7 e 8 / PRD — Objetivos, item 5

**REQ-14**: When the visitor accesses a valid confirmation link, the system shall redirect the browser to `/confirm` and display a message informing that the account has been successfully activated, along with a link to access the system.

> Fonte: Cenário BDD "Confirmacao de conta via link valido" — Then/And / PRD — Objetivos, item 5 / PRD — Fluxo Principal, passo 10 / Estória 3, critério de aceitação 2

**REQ-15**: When the visitor accesses a valid confirmation link for the first time, the system shall invalidate that confirmation link immediately after the successful activation, preventing it from being used again.

> Fonte: Estória 3, critério de aceitação 3 / PRD — Riscos, item "Token de confirmacao previsivel ou reutilizavel"

**REQ-16**: If a confirmation link has expired (more than 24 hours since its creation), the system shall reject the confirmation request and delete the pending registration associated with that link.

> Fonte: Cenário BDD "Confirmacao de cadastro com link expirado" — And "o cadastro pendente associado ao link e removido automaticamente" / PRD — Fluxo Alternativo / PRD — Objetivos, item 6

**REQ-17**: If a confirmation link has expired, the system shall redirect the browser to `/confirm` displaying a message informing that the link has expired and that the visitor must register again, along with a link to the registration page (`/register`).

> Fonte: Cenário BDD "Confirmacao de cadastro com link expirado" — Then/And / PRD — Fluxo Alternativo / Estória 4, critérios de aceitação 3 e 4

**REQ-18**: If a confirmation link has already been used, the system shall reject the request and redirect the browser to `/confirm` displaying a message informing that the confirmation link has already been used.

> Fonte: Cenário BDD "Confirmacao de cadastro com link ja utilizado" — Then / PRD — Riscos

**REQ-19**: If a confirmation link has already been used, the system shall not alter the status of the already active account.

> Fonte: Cenário BDD "Confirmacao de cadastro com link ja utilizado" — And "o sistema nao altera o status da conta" / PRD — Riscos

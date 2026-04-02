# Requisitos Funcionais — Registrar Usuário

## Fluxo Principal

**REQ-1**: Quando o visitante acessa a página de cadastro, o sistema deve exibir um formulário contendo os campos: nome completo, endereço de email, senha, confirmação de senha, data de nascimento e foto de perfil (opcional).

> Fonte: Estória 1, critério de aceitação 1 / PRD — Fluxo Principal, passo 1

**REQ-8**: Quando o visitante envia o formulário de cadastro com todos os dados válidos, o sistema deve criar um cadastro com status "pendente".

> Fonte: Cenário BDD "Cadastro realizado com dados válidos" — Then principal / PRD — Fluxo Principal, passos 3 e 4 / PRD — Objetivos, item 3

**REQ-9**: Quando o visitante envia o formulário de cadastro com todos os dados válidos, o sistema deve enviar um email contendo um link único de confirmação, válido por 24 horas, ao endereço de email informado.

> Fonte: Cenário BDD "Cadastro realizado com dados válidos" — And "o sistema envia um email de confirmação" / PRD — Fluxo Principal, passo 4 / PRD — Objetivos, item 4

## Validação de Entrada

**REQ-2**: Se qualquer campo obrigatório (nome completo, endereço de email, senha, confirmação de senha ou data de nascimento) estiver em branco no momento do envio do formulário, o sistema deve bloquear o envio e exibir uma mensagem de erro indicando qual campo está faltando.

> Fonte: Cenário BDD "Cadastro com dados inválidos no formulário" — situações "nome em branco" e "data de nascimento em branco" / Estória 2, critério de aceitação 1

**REQ-3**: Se o endereço de email informado já estiver associado a uma conta existente, o sistema deve rejeitar o cadastro e exibir a mensagem "Este email já está cadastrado. Tente fazer login ou use outro endereço."

> Fonte: Cenário BDD "Cadastro com dados inválidos no formulário" — situação "email já associado a uma conta existente" / Estória 2, critério de aceitação 1 / PRD — Objetivos, item 2

**REQ-4**: Se a senha informada não atender à política de segurança (mínimo de 8 caracteres contendo letras maiúsculas, minúsculas, números e caracteres especiais), o sistema deve rejeitar o envio do formulário e exibir a mensagem "A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais."

> Fonte: Cenário BDD "Cadastro com dados inválidos no formulário" — situação "senha sem caractere especial" / Estória 2, critério de aceitação 2 / PRD — Objetivos, item 2

**REQ-5**: Se a confirmação de senha informada não for idêntica à senha escolhida, o sistema deve rejeitar o envio do formulário e exibir a mensagem "As senhas não coincidem."

> Fonte: Cenário BDD "Cadastro com dados inválidos no formulário" — situação "confirmação de senha diferente da senha informada" / Estória 2, critério de aceitação 3

**REQ-6**: Se o endereço de email informado não estiver em formato válido, o sistema deve rejeitar o envio do formulário e exibir a mensagem "Informe um endereço de email válido."

> Fonte: Cenário BDD "Cadastro com dados inválidos no formulário" — situação "email com formato inválido" / Estória 2, critério de aceitação 1

**REQ-7**: Se ocorrer qualquer erro de validação durante o envio do formulário de cadastro, o sistema não deve criar nenhum registro de cadastro.

> Fonte: Cenário BDD "Cadastro com dados inválidos no formulário" — Then "nenhum cadastro é criado" / Estória 2, critério de aceitação 4

## Confirmação de Conta

**REQ-10**: Quando o visitante acessa um link de confirmação válido, o sistema deve ativar a conta alterando seu status de "pendente" para "ativo".

> Fonte: Cenário BDD "Confirmação de conta via link válido" / PRD — Fluxo Principal, passos 7 e 8 / PRD — Objetivos, item 5

**REQ-11**: Quando o visitante acessa um link de confirmação válido, o sistema deve redirecionar o navegador para `/confirm` e exibir uma mensagem informando que a conta foi ativada com sucesso e apresentar um link para acessar o sistema.

> Fonte: Cenário BDD "Confirmação de conta via link válido" — Then/And / PRD — Objetivos, item 5 / PRD — Fluxo Principal, passo 10

**REQ-12**: Se um link de confirmação estiver expirado (mais de 24 horas desde sua criação), o sistema deve rejeitar a solicitação de confirmação e excluir o cadastro pendente associado.

> Fonte: Cenário BDD "Confirmação de cadastro com link expirado" — Then "o cadastro pendente é removido automaticamente" / PRD — Fluxo Alternativo / PRD — Objetivos, item 6

**REQ-13**: Se um link de confirmação estiver expirado, o sistema deve redirecionar o navegador para `/confirm` exibindo ao visitante uma mensagem informando que o link expirou e apresentar um link para que o visitante realize um novo cadastro em `/register`.

> Fonte: Cenário BDD "Confirmação de cadastro com link expirado" — Then/And / PRD — Fluxo Alternativo

**REQ-14**: Se um link de confirmação já tiver sido utilizado anteriormente, o sistema deve rejeitar a solicitação e redirecionar o navegador para `/confirm` exibindo ao visitante uma mensagem informando que o link de confirmação já foi utilizado.

> Fonte: Cenário BDD "Confirmação de cadastro com link já utilizado" — Then / PRD — Riscos

**REQ-15**: Se um link de confirmação já tiver sido utilizado anteriormente, o sistema não deve alterar o status da conta já ativa.

> Fonte: Cenário BDD "Confirmação de cadastro com link já utilizado" — And "o sistema não altera o status da conta" / PRD — Riscos

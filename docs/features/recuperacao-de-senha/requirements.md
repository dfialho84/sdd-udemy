# Requisitos Funcionais — Recuperação de Senha

## Solicitação de Recuperação

**REQ-1**: Quando o usuário aciona a opção "Esqueci a senha" na tela de login, o sistema deve exibir um formulário com campo para informar o endereço de e-mail.

> Fonte: Fluxo Principal do PRD / Cenário BDD "Solicitar recuperação com email válido" / Estória 1, critério 1

**REQ-2**: Quando o usuário submete o formulário de recuperação com um endereço de e-mail, o sistema deve exibir a mensagem "Se existe conta com esse email, você receberá um link de recuperação".

> Fonte: Fluxo Principal do PRD / Fluxo Alternativo "Email não encontrado" / Estória 1, critério 2

**REQ-3**: Se o endereço de e-mail informado no formulário de recuperação não estiver em formato válido, o sistema deve rejeitar a submissão e exibir uma mensagem de erro indicando que o formato é inválido.

> Fonte: Estória 1, critério 3 / Fluxo Principal do PRD

## Geração e Envio do Token

**REQ-4**: Quando o e-mail submetido está associado a uma conta ativa, o sistema deve gerar um token único de recuperação com prazo de expiração de 12 horas a partir do momento da geração.

> Fonte: Fluxo Principal do PRD / Cenário BDD "Receber email com link válido" / Estória 2, critérios 1 e 2

**REQ-5**: Quando o token de recuperação é gerado, o sistema deve enviar ao endereço de e-mail associado à conta uma mensagem contendo o link único de recuperação.

> Fonte: Fluxo Principal do PRD / Cenário BDD "Receber email com link válido" / Estória 2, critério 2

**REQ-6**: Quando uma redefinição de senha é concluída com sucesso, o sistema deve invalidar o token de recuperação utilizado, impedindo sua reutilização.

> Fonte: Estória 2, critério 3 / Fluxo Principal do PRD

## Redefinição de Senha

**REQ-7**: Quando o usuário acessa o link de recuperação contendo um token válido e dentro do prazo de expiração, o sistema deve exibir a tela de redefinição de senha com campos para nova senha e confirmação.

> Fonte: Fluxo Principal do PRD / Cenário BDD "Redefinir senha com link válido" / Estória 3, critérios 1 e 2

**REQ-8**: Se a nova senha informada não atender aos critérios de força e complexidade exigidos, o sistema deve rejeitar a submissão, manter o formulário visível e exibir uma mensagem indicando quais critérios não foram atendidos.

> Fonte: Cenário BDD "Redefinir senha com senha fraca" / Estória 3, critério 3

**REQ-9**: Se o valor informado no campo de confirmação de senha for diferente do valor informado no campo de nova senha, o sistema deve rejeitar a submissão, manter o formulário visível e exibir a mensagem "As senhas não coincidem".

> Fonte: Cenário BDD "Redefinir senha com senhas não coincidentes" / Estória 3, critério 2

**REQ-10**: Quando o usuário submete uma nova senha válida com token de recuperação válido, o sistema deve atualizar a credencial da conta e invalidar todas as sessões ativas anteriores associadas a essa conta.

> Fonte: Fluxo Principal do PRD / Cenário BDD "Redefinir senha com link válido" / Estória 3, critério 4

**REQ-11**: Quando a redefinição de senha é concluída com sucesso, o sistema deve exibir uma mensagem de confirmação de sucesso e redirecionar o usuário para a tela de login.

> Fonte: Fluxo Principal do PRD / Cenário BDD "Redefinir senha com link válido" / Estória 3, critério 5

## Fluxos de Erro

**REQ-12**: Se o usuário acessa um link de recuperação cujo token está expirado, o sistema deve rejeitar o acesso à tela de redefinição, exibir a mensagem "O link de recuperação expirou", redirecionar para a página de recuperação e disponibilizar a opção de solicitar um novo link.

> Fonte: Fluxo Alternativo "Link expirado" do PRD / Cenário BDD "Acessar link expirado" / Estória 5, critérios 1, 2, 3 e 4

**REQ-13**: Se o usuário acessa uma URL de recuperação com token malformado ou não reconhecido pelo sistema, o sistema deve rejeitar o acesso, exibir a mensagem "O link de recuperação é inválido" e redirecionar para a página de recuperação.

> Fonte: Fluxo Alternativo "Token inválido" do PRD / Cenário BDD "Acessar link com token inválido" / Estória 6, critérios 1, 2, 3 e 4

**REQ-14**: Se o endereço de e-mail submetido no formulário de recuperação não estiver associado a nenhuma conta, o sistema não deve enviar e-mail e deve exibir a mesma mensagem genérica apresentada para contas existentes, sem revelar se o endereço está ou não cadastrado.

> Fonte: Fluxo Alternativo "Email não encontrado" do PRD / Cenário BDD "Solicitar recuperação com email inexistente" / Estória 4, critérios 1, 2 e 3

**REQ-15**: Quando o sistema exibe a mensagem genérica de confirmação de solicitação de recuperação, o sistema deve apresentar um link de acesso à página de cadastro.

> Fonte: Fluxo Alternativo "Email não encontrado" do PRD / Cenário BDD "Solicitar recuperação com email inexistente" / Estória 4, critério 3

## Segurança

**REQ-16**: Se um endereço IP realizar 5 ou mais solicitações de recuperação de senha dentro de um intervalo de 1 hora, o sistema deve bloquear tentativas subsequentes desse IP, exibir a mensagem "Muitas tentativas de recuperação. Tente novamente em 1 hora" e registrar a tentativa bloqueada nos logs de segurança.

> Fonte: PRD, seção Riscos / Cenário BDD "Exceder limite de tentativas de solicitação" / Estória 7, critérios 1, 2 e 3

**REQ-17**: Enquanto um endereço IP estiver bloqueado para solicitações de recuperação de senha, o sistema deve remover o bloqueio automaticamente após decorrido 1 hora desde a primeira solicitação do intervalo vigente.

> Fonte: Estória 7, critério 4


# Requisitos Não Funcionais — Login

## Performance

**NFR-1**: Em condições normais, o sistema deve responder uma requisição de autenticação bem-sucedida em até 2 segundos para 95% dos casos.

> Fonte: Critério de Sucesso do PRD / Risco de degradação de performance

**NFR-2**: Após a conclusão da autenticação bem-sucedida, o sistema deve redirecionar o usuário para sua área pessoal em até 500 milissegundos para 95% dos casos.

> Fonte: REQ-4 / Estória 1, critério 4 / Fluxo Principal do PRD

## Segurança

**NFR-3**: O sistema deve permitir um máximo de 3 tentativas de autenticação fracassadas por identificador em uma janela deslizante de 10 minutos.

> Fonte: REQ-8 / Critério de Sucesso do PRD / Estória 3, critério 1

**NFR-4**: O sistema deve bloquear automaticamente o identificador por 15 minutos após atingir 3 tentativas de autenticação fracassadas em uma janela de 10 minutos.

> Fonte: REQ-9 / Critério de Sucesso do PRD / Estória 3, critério 3

**NFR-5**: O sistema deve validar a autenticidade e validade da sessão antes de permitir acesso a qualquer recurso protegido.

> Fonte: Risco de sessão inválida permitindo acesso indevido (PRD) / REQ-3

**NFR-6**: O sistema deve exibir a mesma mensagem de erro genérica para todos os casos de falha de autenticação, sem diferenciar entre identificador inexistente, senha incorreta ou conta inativa.

> Fonte: REQ-5 / Risco de exposição de dados sensíveis (PRD) / Estória 2, critério 1

## Observabilidade

**NFR-7**: O sistema deve registrar em log estruturado todas as tentativas de autenticação, incluindo timestamp, identificador utilizado e resultado (sucesso ou falha).

> Fonte: REQ-13 / Objetivo 5 do PRD / Estória 3, critério 2

**NFR-8**: O sistema deve enviar um email de notificação à conta quando uma tentativa de autenticação falha para um identificador válido (conta existente) mas com senha incorreta, dentro de 5 minutos da tentativa fracassada.

> Fonte: REQ-14 / Estória 2, critério 5 / Cenário BDD "Email de aviso para senha incorreta"

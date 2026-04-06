# Requisitos Não Funcionais — Registrar Usuário

## Performance

**NFR-1**: Em condições normais de uso, o sistema deve carregar a página inicial (/) e redirecionar o visitante para a página de cadastro (/register) após o clique no link de registro em até 1 segundo para 95% das requisições.

> Fonte: Cenário BDD "Acessar formulario de cadastro via link na home" / REQ-1 / PRD — Critérios de Sucesso (padrão de performance de páginas)

**NFR-2**: Em condições normais de uso, o sistema deve processar o envio do formulário de cadastro, enviar o email de confirmação e retornar a resposta ao visitante em até 3 segundos para 95% das requisições. Este SLA também se aplica ao fluxo de confirmação de conta quando o visitante clica no link de confirmação.

> Fonte: PRD — Critérios de Sucesso / REQ-3, REQ-4, REQ-5 / Cenário BDD "Confirmacao de conta via link valido" (REQ-12, REQ-13)

**NFR-3**: O sistema deve entregar o email de confirmação ao endereço informado em até 60 segundos após o envio do formulário de cadastro, para no mínimo 95% dos casos em condições normais de uso.

> Fonte: PRD — Critérios de Sucesso ("Email entregue em ate 60 segundos apos o envio do formulario") / REQ-4

## Segurança

**NFR-4**: O sistema deve armazenar senhas aplicando hashing com o algoritmo argon2id, configurado com 64 MB de memória, 3 iterações e paralelismo 2, de forma que nenhuma senha seja persistida em texto simples.

> Fonte: PRD — Objetivos, item 2 ("proteger os dados dos usuários") / REQ-8 (política de senha) / PRD — Riscos

**NFR-5**: O sistema deve gerar tokens de confirmação de conta com entropia mínima de 128 bits, garantindo uso único e invalidação imediata após o primeiro uso bem-sucedido.

> Fonte: PRD — Riscos ("Token de confirmação previsível ou reutilizável") / REQ-14 e REQ-18 (rejeição de link já utilizado)

**NFR-6**: O sistema deve limitar as tentativas de envio do formulário de cadastro a 3 por IP em uma janela de 15 minutos, retornando HTTP 429 quando o limite for excedido.

> Fonte: PRD — Riscos / REQ-3 (criação de cadastro)

## Escalabilidade

**NFR-7**: O sistema deve suportar no mínimo 100 usuários simultâneos no fluxo de cadastro e confirmação de conta sem degradação perceptível de performance ou erros de disponibilidade.

> Fonte: PRD — Problema ("inviabiliza o crescimento organico da base de usuarios") / PRD — Contexto do curso (escopo educacional)

## Disponibilidade

**NFR-8**: O sistema deve manter disponibilidade mínima de 99,9% ao mês para o fluxo de cadastro, equivalente a no máximo 43 minutos de indisponibilidade mensal.

> Fonte: PRD — Objetivos, item 1 ("Permitir que qualquer visitante preencha o formulario de cadastro") / PRD — Problema ("inviabiliza o crescimento organico da base de usuarios")

## Usabilidade

**NFR-9**: O formulário de cadastro (/register) e as páginas de confirmação (/confirm) devem estar em conformidade com a norma WCAG 2.1 nível AA, garantindo acessibilidade para usuários com deficiências visuais, motoras e cognitivas, incluindo compatibilidade com leitores de tela e navegação por teclado.

> Fonte: PRD — Usuário-Alvo ("Qualquer visitante") / Requisito de acessibilidade universal / constitution.md (padrões de qualidade)

## Observabilidade

**NFR-10**: O sistema deve registrar em log estruturado no formato JSON cada tentativa de criação de cadastro e cada falha de envio de email de confirmação, incluindo os campos: timestamp, requestId, email parcialmente mascarado no formato `j***@example.com`, tipoEvento e motivoFalha.

> Fonte: PRD — Riscos / REQ-3 (criação do cadastro) / REQ-4 (envio do email de confirmação)

**NFR-11**: O sistema deve registrar em log estruturado no formato JSON cada evento do fluxo de confirmação de email — confirmação bem-sucedida, link expirado e link já utilizado — incluindo os campos: timestamp, resultado, tokenId (identificador do token, não o valor) e requestId.

> Fonte: PRD — Riscos / REQ-12 (confirmação de email) / REQ-15 (link expirado) / REQ-17, REQ-18 (link já utilizado)

**NFR-12**: Os logs estruturados emitidos pelo sistema nos eventos de NFR-10 e NFR-11 devem ser entregues ao Grafana Loki e permanecer consultáveis por no mínimo 7 dias, de forma que qualquer evento seja recuperável por `requestId` ou `tipoEvento` via Grafana Explore.

> Fonte: NFR-10 / NFR-11 / constitution.md regra 6 ("via stack de observabilidade (OpenTelemetry/Loki)")

# Requisitos Não Funcionais — Registrar Usuário

## Performance

**NFR-1**: Em condições normais de uso, o sistema deve processar o envio do formulário de cadastro e retornar a resposta ao visitante em até 3 segundos para 95% das requisições.

> Fonte: PRD — Critérios de Sucesso / REQ-8 (criação do cadastro com status pendente)

## Segurança

**NFR-2**: O sistema deve armazenar senhas aplicando hashing com o algoritmo argon2id, configurado com 64 MB de memória, 3 iterações e paralelismo 2, de forma que nenhuma senha seja persistida em texto simples.

> Fonte: PRD — Objetivos, item 2 ("proteger os dados dos usuários") / REQ-4 (política de senha) / PRD — Riscos

**NFR-3**: O sistema deve gerar tokens de confirmação de conta com entropia mínima de 128 bits, garantindo uso único e invalidação imediata após o primeiro uso bem-sucedido.

> Fonte: PRD — Riscos ("Token de confirmação previsível ou reutilizável") / REQ-14 e REQ-15 (rejeição de link já utilizado)

**NFR-4**: O sistema deve limitar as tentativas de envio do formulário de cadastro a 3 por IP em uma janela de 15 minutos, retornando HTTP 429 quando o limite for excedido.

> Fonte: PRD — Riscos / REQ-8 (criação de cadastro)

## Disponibilidade

**NFR-5**: O sistema deve manter disponibilidade mínima de 99,9% ao mês para o fluxo de cadastro, equivalente a no máximo 43 minutos de indisponibilidade mensal.

> Fonte: PRD — Objetivos, item 1 ("Permitir que qualquer visitante preencha o formulario de cadastro") / PRD — Problema ("inviabiliza o crescimento organico da base de usuarios")

## Observabilidade

**NFR-6**: O sistema deve registrar em log estruturado no formato JSON cada tentativa de criação de cadastro e cada falha de envio de email de confirmação, incluindo os campos: timestamp, requestId, email parcialmente mascarado no formato `j***@example.com`, tipoEvento e motivoFalha.

> Fonte: PRD — Riscos / REQ-8 (criação do cadastro) / REQ-9 (envio do email de confirmação)

**NFR-7**: O sistema deve registrar em log estruturado no formato JSON cada evento do fluxo de confirmação de email — confirmação bem-sucedida, link expirado e link já utilizado — incluindo os campos: timestamp, resultado, tokenId (identificador do token, não o valor) e requestId.

> Fonte: PRD — Riscos / REQ-10 (confirmação de email) / REQ-12 (link expirado) / REQ-14 (link já utilizado)

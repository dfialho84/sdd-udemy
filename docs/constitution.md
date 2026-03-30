# constitution.md

## Purpose

Este documento define as regras técnicas não-negociáveis que governam todas as implementações na plataforma de delivery (curso SDD/Udemy). Toda ambiguidade deve ser resolvida explicitamente — nunca assumida.

---

## Must Do

1. Toda lógica de negócio deve residir na camada Domain e ser independente de frameworks, transporte e persistência.
2. Todos os erros devem ser propagados com estrutura padronizada contendo código de erro, mensagem e metadados contextuais (requestId, timestamp).
3. Toda entrada externa deve ser validada no limite do sistema (adapter HTTP inbound) antes de chegar ao Domain.
4. Toda operação que altera estado deve ser registrada em log estruturado (JSON).
5. Toda mudança de código deve ser rastreável a um requisito funcional, user story ou cenário BDD documentado em `docs/`.
6. Imagens Docker devem sempre fixar uma versão estável específica — nunca usar a tag `latest`.
7. Todos os testes (UT, IT, GH, PT, ST) devem ser escritos antes do código de produção correspondente — a implementação de uma unidade começa apenas depois que o teste que a especifica existe e falha (red). Código de produção escrito antes do teste correspondente deve ser revertido ou reescrito após o teste estar em falha.

---

## Ask Before Proceeding

8. Se um requisito ou critério de aceitação for ambíguo ou tiver múltiplas interpretações possíveis, pare e solicite clareza antes de implementar.
9. Se houver mais de uma opção arquitetural válida (ex.: onde alocar uma responsabilidade entre Domain, Port ou Adapter), pare e apresente as opções para decisão explícita.
10. Se uma mudança afetar o contrato de uma Port (interface inbound ou outbound), pare e confirme o impacto nos adapters antes de prosseguir.
11. Se uma implementação exigir violar uma regra desta constituição, pare e escale para revisão — nunca viole silenciosamente.
12. Se qualquer artefato SDD da feature (`prd.md`, `stories.md`, `scenarios.feature`, `requirements.md`, `nf-requirements.md`, `design.md`, `test-strategy.md`, `tasks.md`) ainda não estiver concluído, pare e não inicie a implementação.

---

## Never Do

13. Nunca importar Drizzle (ou qualquer client de banco de dados) diretamente em entidades de Domain ou em casos de uso — acesso a dados pertence exclusivamente aos adapters outbound.
14. Nunca colocar lógica de negócio em Route Handlers (`app/api/**/route.ts`), Server Actions ou componentes React — esses artefatos são adapters de transporte, não domínio.
15. Nunca engolir erros silenciosamente (catch vazio, `console.log` sem re-throw) — todo erro deve ser propagado ou registrado com estrutura padronizada.
16. Nunca acoplar o Domain a tipos ou interfaces de frameworks (Next.js, Drizzle, React) — o Domain deve depender apenas de tipos próprios e das Ports.
17. Nunca assumir o comportamento de um requisito não especificado — pare e solicite clareza.
18. Nunca usar Redux para armazenar dados que podem ser buscados no servidor via Server Components ou Server Actions.

---

## Enforcement

19. Todo plano de implementação deve declarar explicitamente como cada regra desta constituição é satisfeita — planos que omitem esse mapeamento são inválidos.
20. Qualquer implementação que viole uma regra desta constituição é inválida e deve ser corrigida antes do merge.
21. Se houver ambiguidade ou falta de clareza que impeça aplicar uma regra desta constituição, a implementação deve ser bloqueada até que a clareza seja obtida.

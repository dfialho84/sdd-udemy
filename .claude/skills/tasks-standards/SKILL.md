---
name: tasks-standards
description: >
    Padrões de qualidade para criação de tasks de implementação no formato tasks.md.
    Tasks são organizadas por requisito funcional (um bloco por REQ), com
    granularidade de card de board (uma task por método, endpoint ou migration).
    Cada task tem checkbox, descrição, rastreabilidade e dependências.
    Use junto com interview-guide e tasks-example como régua de qualidade.
---

# Padrões de Tasks de Implementação

## O que é o tasks.md

O `tasks.md` transforma o design técnico em **cards de implementação granulares,
rastreáveis e prontos para entrar num board**. Cada task é uma unidade de trabalho
independente: pode ser implementada, revisada e marcada como concluída separadamente.

A organização é por **requisito funcional** — cada REQ tem seu bloco, e todas as
tasks necessárias para implementar aquele requisito ficam agrupadas nele.

---

## Posição no fluxo SDD

```
constitution.md → prd.md → stories.md → scenarios.feature
→ requirements.md → nf-requirements.md → design.md → tasks.md
                                                        ↑
                                          docs/design-system/ (opcional)
```

O `design.md` é a fonte primária das tasks (o que implementar).
O `requirements.md` define a estrutura do arquivo (como organizar).
A pasta `docs/design-system/` é **opcional**: quando presente, fornece contexto
para tasks de UI — tokens de design a aplicar, componentes a reutilizar e padrões
visuais que podem gerar tasks de adaptação ou conformidade.

---

## Estrutura do arquivo

```markdown
# Tasks — <Nome da Feature>

## REQ-1 — <Título do Requisito>

> <Texto completo do requisito>

### T-01: <Título da task>
- [ ] <descrição>
**Rastreabilidade:** ...
**Depende de:** ...
**Concluída quando:** ...

### T-02: <Título da task>
...

---

## REQ-2 — <Título do Requisito>
...

---

## NFRs sem REQ direto   ← apenas se houver NFRs não cobertos nos blocos acima
...
```

---

## Formato de cada task

```markdown
### T-<NN>: <Título imperativo e específico>

- [ ] <O que deve ser feito, em 1-3 frases. Sem código. Sem genericidade.>

**Rastreabilidade:** <REQ-N> · <NFR-N> · <Scenario: "nome exato do cenário">
**Depende de:** <T-NN, T-NN> ou `—`
**Concluída quando:** <Uma frase verificável por qualquer membro do time.>
```

### Campos obrigatórios

| Campo | Regra |
|-------|-------|
| ID | Sequencial global: T-01, T-02... (não reinicia por bloco) |
| Título | Imperativo, específico. Começa com verbo: "Implementar", "Criar", "Configurar", "Cobrir" |
| Checkbox + descrição | 1-3 frases. Sem código. Sem nome de função isolado sem contexto. |
| Rastreabilidade | Ao menos um REQ ou NFR. Adiciona Scenario quando é task de teste ou implementa Scenario diretamente. |
| Depende de | IDs de tasks bloqueantes, ou `—` se nenhuma. |
| Concluída quando | Critério verificável. Evitar "quando estiver pronto" — dizer o que se observa. |

---

## Critérios de qualidade por tipo de task

### Tasks de modelo / dados
- [ ] Uma task por entidade nova (definição no ORM)
- [ ] Uma task de migration separada por entidade
- [ ] Uma task de schema de validação de payload por endpoint (ex: Zod, Joi)
- [ ] Tasks de modelo não dependem de tasks de domínio, infraestrutura ou API

### Tasks de domínio
- [ ] Uma task por método de domínio (ex: `generateCode()`, `validateCode()`, `validatePasswordStrength()`)
- [ ] A descrição não menciona banco de dados, HTTP ou serviço externo
- [ ] O critério de conclusão é testável unitariamente, sem dependências externas

### Tasks de infraestrutura
- [ ] Uma task por método de repository (ex: `save()`, `findValid()` e `markAsUsed()` são três tasks)
- [ ] Uma task por adapter de serviço externo (EmailAdapter e SmsAdapter são tasks separadas)
- [ ] Tasks de NFR técnico (rate limiting, hashing, logging) estão aqui, não no domínio ou na API
- [ ] Cada NFR de `nf-requirements.md` é coberto por ao menos uma task nesta categoria

### Tasks de API
- [ ] Uma task por endpoint (não por método HTTP genérico — o path importa)
- [ ] Uma task por handler de erro relevante (400, 401, 422, 429...)
- [ ] Tasks de API dependem das tasks de infraestrutura que usam

### Tasks de teste
- [ ] Uma task por Scenario do arquivo `.feature` (nomenclatura exata do Scenario)
- [ ] Uma task por teste unitário de regra de domínio crítica
- [ ] Uma task por NFR com critério mensurável (ex: bcrypt ≥ 100ms, entrega em ≤ 30s)
- [ ] Tasks de teste E2E dependem do endpoint testado
- [ ] Tasks de teste unitário dependem do componente de domínio testado
- [ ] **Nenhuma task de teste é listada como dependência de task de implementação**

### Tasks de UI (somente quando `docs/design-system/` existir)
> Esta seção é opcional — aplica-se apenas quando a pasta `docs/design-system/` está presente no projeto.
- [ ] Componentes de UI referenciados no `design.md` têm tasks que mencionam o componente de design system a reutilizar (ex: `Button`, `Input` de `components.md`)
- [ ] Tokens de cor, tipografia ou espaçamento definidos no design system são referenciados na descrição das tasks de estilo — não valores literais (`color: #fff`)
- [ ] Se o design system define um tema (ex: light/dark), tasks de suporte a tema são explícitas

---

## Regra de agrupamento por REQ

- Cada task pertence ao bloco do REQ que ela endereça **primariamente**.
- Se uma task implementa algo usado por múltiplos REQs, ela fica no bloco do REQ de menor numeração e é referenciada nos demais via rastreabilidade.
- NFRs vão no bloco do REQ ao qual estão relacionados (campo `Fonte` do NFR). NFRs sem REQ direto formam bloco próprio ao final.
- Scenarios BDD vão no bloco do REQ primário que cobrem.

---

## Cobertura mínima obrigatória

O `tasks.md` só está completo quando:

- [ ] Cada REQ de `requirements.md` tem bloco próprio com ao menos 1 task
- [ ] Cada NFR de `nf-requirements.md` está coberto por ao menos 1 task (no bloco do REQ relacionado ou avulso)
- [ ] Cada Scenario de `scenarios.feature` tem ao menos 1 task de teste
- [ ] Cada componente novo do `design.md` tem ao menos 1 task
- [ ] Cada endpoint do `design.md` tem ao menos 1 task de implementação e 1 task de teste

---

## Referências

- Guia para refinamento do índice: `references/interview-guide.md`
- Exemplo anotado de tasks.md completo: `references/tasks-example.md`

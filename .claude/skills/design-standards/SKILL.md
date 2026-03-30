---
name: design-standards
description: >
    Padrões de qualidade para criação de documentos de design técnico neste
    projeto. Define as 7 seções obrigatórias, critérios de qualidade por seção,
    como derivar decisões a partir de todos os artefatos SDD anteriores (PRD,
    Stories, BDD Scenarios, Requirements, NF-Requirements), formato esperado
    e regras gerais. Use junto com o interview-guide para conduzir a entrevista
    e o design-example como régua de qualidade.
---

# Padrões de Design Técnico

## O que é o design.md

O `design.md` é o documento que traduz **requisitos em decisões técnicas verificáveis**.
Ele responde à pergunta "como o sistema vai fazer o que foi pedido?" e serve como
contrato entre quem especificou (PRD, requisitos) e quem vai implementar.

O design não é um documento de código. Ele descreve componentes, contratos,
fluxos e decisões — não funções, classes ou queries SQL.

---

## Posição no fluxo SDD

O `design.md` é produzido **após** todos os artefatos de especificação:

```
constitution.md → prd.md → stories.md → scenarios.feature → requirements.md → nf-requirements.md → design.md
```

Todos os artefatos anteriores são fontes de entrada para o design, com papéis distintos:

| Artefato | Papel no design |
|----------|----------------|
| `requirements.md` | O que o sistema **deve** fazer (comportamento obrigatório) |
| `nf-requirements.md` | Como o sistema **deve se comportar** (performance, segurança, observabilidade) |
| `scenarios.feature` | Esqueleto dos **fluxos de execução** e **contratos de API** |
| `stories.md` | **Critérios de aceitação** e validações de entrada |
| `prd.md` | **Dependências externas**, riscos e o que está fora de escopo |
| `doc/constitution.md` | **Restrições arquiteturais globais** não negociáveis |

---

## Estrutura obrigatória

Um `design.md` é composto pelas seguintes seções, nesta ordem:

1. Visão Geral Técnica
2. Arquitetura de Componentes
3. Modelo de Dados
4. API / Contratos
5. Fluxo de Execução
6. Decisões Técnicas
7. Checklist de Implementação

---

## Seções e critérios de qualidade

### 1. Visão Geral Técnica

**Propósito:** Descrever em 2-4 frases como o sistema resolve o problema tecnicamente.

**Formato:** Texto corrido (sem bullets, sem tabelas).

**Checklist de qualidade:**
- [ ] Descreve a abordagem técnica principal (não o que a feature faz para o usuário — isso é o PRD)
- [ ] Menciona as tecnologias-chave envolvidas (ex: OTP, bcrypt, Redis, serviço de email/SMS)
- [ ] Referencia a camada arquitetural ou padrão adotado (ex: hexagonal, event-driven)
- [ ] É consistente com as restrições da `doc/constitution.md`
- [ ] Tem no máximo 4 frases

**Sinal de qualidade suficiente:** Um desenvolvedor entende a abordagem sem precisar ler os detalhes.

---

### 2. Arquitetura de Componentes

**Propósito:** Identificar todos os componentes do sistema envolvidos na feature e suas responsabilidades.

**Formato:** Lista de componentes. Para cada componente:
```
### <NomeDoComponente>
- **Camada:** <domain | application | infrastructure | interface>
- **Responsabilidade:** <uma frase>
- **Depende de:** <lista de outros componentes ou "—">
```

**Checklist de qualidade:**
- [ ] Cada componente tem uma responsabilidade única e clara
- [ ] As camadas seguem a arquitetura declarada na `doc/constitution.md`
- [ ] Dependências apontam para dentro (infraestrutura → aplicação → domínio), nunca ao contrário
- [ ] Nenhum componente acumula responsabilidades de camadas diferentes
- [ ] Todos os requisitos funcionais são endereçados por ao menos um componente
- [ ] Serviços externos (email, SMS) estão isolados em adapters de infraestrutura — nunca chamados diretamente do domínio
- [ ] Novos componentes (não existentes no projeto) estão explicitamente sinalizados

**Sinal de qualidade suficiente:** Dá para desenhar um diagrama de dependências sem ambiguidade.

---

### 3. Modelo de Dados

**Propósito:** Descrever as entidades e relações necessárias para a feature.

**Formato:** Para cada entidade:
```
### <NomeDaEntidade>
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id    | UUID | Identificador único |
| ...   | ...  | ... |

**Relações:** <descrição das relações com outras entidades>
```

**Checklist de qualidade:**
- [ ] Todas as entidades são deriváveis dos requisitos ou cenários BDD — nenhuma inventada
- [ ] Cada campo tem tipo e descrição claros
- [ ] Relações estão explícitas (1:N, N:N, etc.)
- [ ] Campos de controle de expiração e uso único estão presentes onde NFRs exigem (ex: TTL para código OTP)
- [ ] Campos de auditoria (created_at, updated_at) estão declarados se o padrão do projeto exige
- [ ] Nenhum detalhe de DDL ou migração (sem CREATE TABLE, sem índices explícitos)

**Sinal de qualidade suficiente:** Um desenvolvedor consegue criar a migration sem precisar de mais contexto.

---

### 4. API / Contratos

**Propósito:** Especificar todos os endpoints, eventos ou mensagens que a feature expõe ou consome.

**Fonte primária:** Os cenários BDD — cada Scenario tende a corresponder a um endpoint ou a um estado de resposta diferente do mesmo endpoint.

**Formato REST:** Para cada endpoint:
```
### <MÉTODO> <path>
- **Autenticação:** <JWT | pública>
- **Request body:**
  ```json
  { ... }
  ```
- **Response 200:**
  ```json
  { ... }
  ```
- **Erros:**
  | Código | Condição |
  |--------|----------|
  | 400    | <condição derivada dos cenários BDD> |
  | 429    | <condição derivada dos NFRs de rate limiting> |
```

**Checklist de qualidade:**
- [ ] Cada endpoint corresponde a ao menos um requisito funcional ou cenário BDD
- [ ] Payloads de entrada estão definidos com campos e tipos
- [ ] Respostas de sucesso estão definidas
- [ ] Todos os cenários de erro dos cenários BDD têm um código HTTP correspondente
- [ ] Cenários de bloqueio por rate limit (NFRs) têm código 429
- [ ] Respostas neutras (anti-enumeração) estão explícitas nos endpoints que exigem (NFR-3)
- [ ] A autenticação de cada endpoint está declarada

**Sinal de qualidade suficiente:** Um desenvolvedor front-end consegue integrar sem perguntar nada.

---

### 5. Fluxo de Execução

**Propósito:** Descrever em passos numerados o que acontece internamente quando cada caso principal é executado.

**Fonte primária:** Os cenários BDD — cada Scenario é um fluxo a descrever em passos de execução interna.

**Formato:** Para cada fluxo:
```
### Fluxo: <nome do Scenario BDD correspondente>
1. <Componente> recebe <entrada> e <faz o quê>
2. <Componente> valida/processa <o quê> e <produz o quê>
...
N. Sistema retorna <saída>

**Fluxos alternativos:**
- Se <condição do cenário BDD de erro>: <o que acontece> → retorna <erro/resposta>
```

**Checklist de qualidade:**
- [ ] Há um fluxo para cada Scenario do arquivo `.feature`
- [ ] O caminho feliz está descrito passo a passo, do request até a resposta
- [ ] Cada passo nomeia o componente responsável
- [ ] Os fluxos alternativos cobrem todos os cenários BDD de erro
- [ ] O comportamento de invalidação imediata após uso (REQ-10 / NFR-2) está explícito no fluxo
- [ ] O comportamento de resposta neutra (NFR-3) está explícito no fluxo de dado não cadastrado
- [ ] Nenhum passo é vago ("o sistema processa" sem especificar o que)

**Sinal de qualidade suficiente:** Dá para rastrear qualquer bug sem precisar ler o código.

---

### 6. Decisões Técnicas

**Propósito:** Registrar as decisões de design que envolvem trade-offs ou que não são óbvias.

**Formato:** Para cada decisão:
```
### DT-<N>: <título da decisão>
- **Problema:** <o que estava em aberto>
- **Alternativas consideradas:** <lista>
- **Decisão:** <o que foi escolhido>
- **Justificativa:** <por quê — inclua o trade-off>
- **Requisito relacionado:** <REQ-N ou NFR-N>
```

**Checklist de qualidade:**
- [ ] Apenas decisões com trade-off real estão listadas (não decisões óbvias)
- [ ] Cada decisão tem ao menos duas alternativas consideradas
- [ ] A justificativa menciona o trade-off (o que foi sacrificado em troca do benefício)
- [ ] Cada decisão está rastreada a ao menos um requisito funcional ou NFR
- [ ] Nenhuma decisão contradiz a `doc/constitution.md`
- [ ] A escolha do mecanismo de verificação (OTP numérico vs. link mágico) está registrada se não for óbvia
- [ ] A estratégia de rate limiting (Redis vs. banco) está registrada se não for óbvia

**Sinal de qualidade suficiente:** Um novo desenvolvedor entende por que o design é assim, não apenas como.

---

### 7. Checklist de Implementação

**Propósito:** Fornecer uma lista verificável de itens que devem ser concluídos para considerar a feature implementada.

**Formato:** Lista agrupada por fase, com checkboxes:
```
### Fase 1: Modelo
- [ ] Criar entidade <Nome> com campos <lista>
- [ ] Criar migration para a tabela <nome>

### Fase 2: Domínio
- [ ] Implementar <NomeDoComponente> com responsabilidade <descrição>
- [ ] Implementar regra de <validação específica>

### Fase 3: Infraestrutura
- [ ] Implementar adapter de <serviço externo> (email / SMS)
- [ ] Implementar repository <Nome> com métodos <lista>

### Fase 4: API
- [ ] Implementar endpoint <MÉTODO> <path>
- [ ] Implementar resposta neutra para <condição NFR-3>

### Fase 5: Testes
- [ ] Cobrir cenário BDD: "<nome do Scenario>"
- [ ] Teste de integração para <endpoint>
```

**Checklist de qualidade:**
- [ ] Cada requisito funcional de `requirements.md` tem ao menos um item no checklist
- [ ] Cada NFR de `nf-requirements.md` tem ao menos um item no checklist
- [ ] Todos os componentes da seção 2 têm ao menos um item de implementação
- [ ] Todos os endpoints da seção 4 têm ao menos um item de implementação
- [ ] Cada Scenario do `.feature` tem ao menos um item de teste correspondente
- [ ] Os itens são verificáveis (sim/não) — sem itens vagos como "implementar lógica de negócio"

**Sinal de qualidade suficiente:** O checklist pode ser usado como lista de tasks num board sem refinamento adicional.

---

## Regras gerais de formato

- **Idioma:** português por padrão. Nomes de componentes, campos, endpoints e tipos ficam em inglês.
- **Rastreabilidade:** sempre que possível, referencie o requisito (REQ-N) ou NFR (NFR-N) que motivou a decisão.
- **Sem código:** o design.md não contém código fonte. Pseudocódigo é aceitável apenas em Fluxo de Execução quando um passo é complexo demais para descrever em prosa.
- **Sem repetição:** se uma informação já está no PRD ou nos requisitos, referencie — não copie.
- **Separadores:** usar `---` entre seções para facilitar leitura.
- **Consistência com a `doc/constitution.md`:** qualquer regra da constituição que se aplica à feature deve ser refletida no design.

---

## Referências

- Guia de entrevista e banco de perguntas: `references/interview-guide.md`
- Exemplo anotado de design de qualidade: `references/design-example.md`

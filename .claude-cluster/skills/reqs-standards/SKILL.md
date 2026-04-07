---
name: reqs-standards
description: >
    Padrões de qualidade para criação de requisitos funcionais no formato EARS
    neste projeto. Define a estrutura obrigatória de cada requisito, os quatro
    padrões EARS, critérios de qualidade, como derivar requisitos do PRD, User
    Stories e cenários BDD, formato esperado e regras gerais. Use junto com o
    interview-guide para conduzir a entrevista e o reqs-example como régua de
    qualidade.
---

# Padrões de Requisitos Funcionais (EARS)

## O que é um requisito funcional

Um requisito funcional descreve **uma capacidade obrigatória do sistema**.
Ele transforma comportamentos desejados (expressos em BDD) em **obrigações formais**.

A linguagem padrão deste projeto usa o método **EARS (Easy Approach to Requirements Syntax)**
com o verbo modal **shall** para indicar obrigação.

---

## Os quatro padrões EARS

### Ubiquitous (ubíquo)

Usado quando o sistema deve executar um comportamento **sempre**, independentemente de estado ou evento.

```
The system shall <behavior>.
```

Exemplo:
```
The system shall log all authentication attempts.
```

---

### Event-driven (orientado a evento)

Usado quando um **evento externo** dispara um comportamento obrigatório do sistema.

```
When <event>, the system shall <behavior>.
```

Exemplo:
```
When valid credentials are submitted, the system shall authenticate the delivery driver.
```

---

### State-driven (orientado a estado)

Usado quando o sistema está em um **estado específico** e deve manter um comportamento enquanto permanecer nele.

```
While <state>, the system shall <behavior>.
```

Exemplo:
```
While the driver session is active, the system shall allow access to protected resources.
```

---

### Unwanted behavior (comportamento indesejado)

Usado quando uma **condição de falha ou erro** ocorre e o sistema deve reagir de forma obrigatória.

```
If <condition>, the system shall <behavior>.
```

Exemplo:
```
If invalid credentials are submitted, the system shall reject the authentication request.
```

---

## Estrutura obrigatória do arquivo `requirements.md`

```markdown
# Requisitos Funcionais — <Nome da Feature>

## <Grupo 1, ex: Fluxo Principal>

**REQ-1**: When <event>, the system shall <behavior>.

> Fonte: Fluxo Principal do PRD / Cenário BDD "Título do cenário"

**REQ-2**: The system shall <behavior>.

> Fonte: Objetivo X do PRD

## <Grupo 2, ex: Validação de Entrada>

**REQ-3**: If <condition>, the system shall <behavior>.

> Fonte: Fluxo Alternativo Y do PRD / Estória Z, critério de aceitação N
```

---

## Critérios de qualidade por requisito

### Clareza

**Checklist:**
- [ ] O requisito descreve um único comportamento (não mistura dois comportamentos em uma frase)
- [ ] O verbo **shall** é usado — nunca "should", "may", "can" ou "must"
- [ ] O sujeito é sempre "the system" (nunca o usuário, nunca um componente técnico)

---

### Testabilidade

**Checklist:**
- [ ] É possível escrever um teste que prove que o requisito foi atendido ou violado
- [ ] Não usa termos vagos: "corretamente", "de forma adequada", "quando necessário", "rápido"
- [ ] O comportamento descrito é observável externamente (não estado interno do banco, memória ou log)

---

### Independência de tecnologia

**Checklist:**
- [ ] Não menciona linguagem de programação, framework, biblioteca ou banco de dados
- [ ] Não menciona JWT, bcrypt, MySQL, Redis, Next.js, React, ou qualquer tecnologia específica
- [ ] Usa vocabulário de domínio do negócio

---

### Rastreabilidade

**Checklist:**
- [ ] O campo `> Fonte:` identifica de onde o requisito foi derivado (PRD, Story ou cenário BDD)
- [ ] Cada cenário BDD tem ao menos um requisito correspondente
- [ ] Cada critério de aceitação das Stories está coberto por ao menos um requisito

---

## Critério de qualidade do conjunto de requisitos

| Critério | Verificação |
|---|---|
| **Cobertura** | Todo cenário BDD tem ao menos 1 requisito correspondente |
| **Completude** | Todo critério de aceitação das Stories está coberto |
| **Consistência** | O vocabulário é uniforme entre requisitos (mesma nomenclatura do PRD) |
| **Não-redundância** | Dois requisitos não descrevem o mesmo comportamento com palavras diferentes |
| **Escopo** | Nenhum requisito cobre itens listados no "Fora do Escopo" do PRD |

---

## Como derivar requisitos dos três artefatos

### Do PRD

| Seção do PRD | Padrão EARS resultante |
|---|---|
| Objetivos com verbo "Permitir" | `When <ação>, the system shall <comportamento>` |
| Objetivos com verbo "Rejeitar" / "Validar" | `If <condição>, the system shall <comportamento>` |
| Fluxo Principal — passo do sistema | `When <evento do usuário>, the system shall <resposta>` |
| Fluxos Alternativos | `If <condição de falha>, the system shall <comportamento>` |
| Critérios de Sucesso mensuráveis | Verificar se há requisito correspondente |

### Das User Stories

- Cada **critério de aceitação** de happy path → 1 requisito `When`
- Cada **critério de aceitação de validação** → 1 requisito `If`
- Cada **critério de aceitação de segurança** → 1 requisito `If` ou `While`

### Dos cenários BDD

Para cada cenário:
1. Identifique o evento principal (`When`)
2. Identifique o comportamento esperado (`Then`)
3. Transforme em obrigação do sistema usando o padrão EARS correspondente
4. Se o `Then` tiver `And`, considere criar um segundo requisito separado

---

## Regras gerais de formato

- **Arquivo de saída:** `docs/features/<slug>/requirements.md`
- **Idioma dos requisitos:** inglês (padrão EARS é em inglês)
- **Comentários e anotações:** português (campo `> Fonte:`, títulos dos grupos `##`)
- **Numeração:** sequencial global — REQ-1, REQ-2, REQ-3... (não reinicia por grupo)
- **Agrupamento:** use cabeçalhos `##` para organizar por categoria (Fluxo Principal, Validação, Segurança...)
- **Separação:** linha em branco entre requisitos

---

## Referências

- Guia de entrevista e banco de perguntas: `references/interview-guide.md`
- Exemplo anotado de requisitos de qualidade: `references/reqs-example.md`

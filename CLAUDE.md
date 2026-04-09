# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Aplicação de quadros Kanban para gerenciamento de sprints, desenvolvida com a metodologia **SDD (Software Design Documents)** com agentes, comandos e skills localizados em `.claude/`.

## Stack

- **Framework**: Next.js com TypeScript
- **UI**: Tailwind CSS + shadcn/ui (use componentes já existentes em `.claude/` — não instalar `next-sdd` nem outras libs não listadas)
- **Autenticação**: next-auth
- **ORM**: Drizzle
- **Validação de Fomulários**: zod
- **Forms**: react hook form
- **Banco**: MySQL
- **Repositório de arquivos**: MinIO
- **Testes unitários/integração**: Jest
- **Testes E2E**: Cypress + Cucumber
- **Testes de carga**: k6
- **Email (dev)**: Mailhog
- **Observabilidade**: OpenTelemetry → Jaeger (tracing) · Prometheus (métricas) · Grafana Loki (logs) · Grafana (dashboards)
- **Infra local**: Docker Compose (serviços de ambiente de teste — comente a inclusão de cada serviço ao adicioná-lo)

## Arquitetura Hexagonal

```
Domain         → lógica de negócio pura; sem dependência de frameworks, transporte ou persistência
Ports          → interfaces inbound (casos de uso) e outbound (repositórios, serviços externos)
Adapters       → implementações concretas das Ports (HTTP handlers, Drizzle repositories, email, etc.)
```

Regras críticas (ver `docs/constitution.md` para a lista completa):

- Lógica de negócio **só** no Domain.
- Drizzle **nunca** é importado em entidades Domain ou casos de uso.
- Route Handlers (`app/api/**/route.ts`), Server Actions e componentes React são adapters de transporte — sem lógica de negócio.
- Domain depende **apenas** de tipos próprios e das Ports — nunca de tipos Next.js, Drizzle ou React.
- Toda entrada externa é validada no adapter HTTP inbound antes de chegar ao Domain.

## Comandos do Projeto

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Testes unitários/integração
npm run test
npm run test -- --testPathPattern=<caminho>  # teste único

# Testes E2E
npx cypress run
npx cypress open

# Testes de carga
k6 run <script.js>

# Lint
npm run lint
```

## Metodologia SDD — Sequência de Desenvolvimento

Para cada feature, siga esta ordem obrigatória. Não inicie a implementação sem todos os artefatos concluídos.

| Passo | Comando / Agente               | Artefato gerado                           |
| ----- | ------------------------------ | ----------------------------------------- |
| 1     | `/create-prd <slug>`           | `docs/features/<slug>/prd.md`             |
| 2     | `/create-user-stories <slug>`  | `docs/features/<slug>/stories.md`         |
| 3     | `/create-scenarios <slug>`     | `docs/features/<slug>/scenarios.feature`  |
| 4     | `/create-reqs <slug>`          | `docs/features/<slug>/requirements.md`    |
| 5     | `/create-nf-reqs <slug>`       | `docs/features/<slug>/nf-requirements.md` |
| 6     | `/create-design <slug>`        | `docs/features/<slug>/design.md`          |
| 7     | `/create-test-strategy <slug>` | `docs/features/<slug>/test-strategy.md`   |
| 8     | `/create-tasks <slug>`         | `docs/features/<slug>/tasks.md`           |
| 9     | `/implement <slug>`            | código de produção + testes               |

## Comandos e Agentes Disponíveis

### Comandos (slash commands)

| Comando                 | Descrição                                                        |
| ----------------------- | ---------------------------------------------------------------- |
| `/create-prd`           | Cria o PRD da feature de forma incremental                       |
| `/create-user-stories`  | Cria as user stories a partir do PRD                             |
| `/create-scenarios`     | Cria cenários BDD (Gherkin) a partir do PRD e stories            |
| `/create-reqs`          | Cria requisitos funcionais no formato EARS                       |
| `/create-nf-reqs`       | Cria requisitos não funcionais                                   |
| `/create-constitution`  | Cria/atualiza `docs/constitution.md`                             |
| `/create-design-system` | Cria/atualiza `docs/design-system`                               |
| `/create-design`        | Cria o documento de design técnico                               |
| `/create-test-strategy` | Cria a estratégia de testes                                      |
| `/create-tasks`         | Gera tasks de implementação organizadas por requisito            |
| `/implement`            | Implementa tasks de forma incremental (uma por vez)              |
| `/commit`               | Sugere mensagem de commit no padrão conventional commits (PT-BR) |

### Agentes disponíveis

Os comandos acima delegam para agentes especializados em `.claude/agents/`. Cada agente conduz uma entrevista incremental — artefato por artefato — e salva o resultado em `docs/features/<slug>/`.

## Regras de Implementação

- Testes são escritos **antes** do código de produção (TDD red→green).
- Toda task deve ter rastreabilidade a um requisito funcional, story ou cenário BDD em `docs/`.
- Erros propagados com estrutura padronizada: `{ código, mensagem, requestId, timestamp }`.
- Operações que alteram estado: log estruturado (JSON) obrigatório.
- Imagens Docker: sempre fixar versão estável — nunca usar tag `latest`.
- Se qualquer artefato SDD (`prd.md`, `stories.md`, `scenarios.feature`, `requirements.md`, `nf-requirements.md`, `design.md`, `test-strategy.md`, `tasks.md`) estiver incompleto, bloquear implementação.

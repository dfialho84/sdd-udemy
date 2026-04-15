# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Aplicação de quadros Kanban para gerenciamento de sprints, desenvolvida com a metodologia **SDD (Software Design Documents)** com agentes, comandos e skills localizados em `.claude/`.

## Stack

As informações da stack de tecnologias estão em `docs/stack.md`.

## Arquitetura Hexagonal

As informações de arquitetura estão em `docs/arquitetura.md`.

## Comandos do Projeto

Os comandos do projeto estão documentados em `docs/comandos.md`.

## Metodologia SDD — Sequência de Desenvolvimento

Para cada feature, siga esta ordem obrigatória. Não inicie a implementação sem todos os artefatos concluídos.

| Passo | Comando / Agente               | Artefato gerado                           |
| ----- | ------------------------------ | ----------------------------------------- |
| 1     | `/create-prd <slug>`           | `docs/features/<slug>/prd.md`             |
| 2     | `/create-user-stories <slug>`  | `docs/features/<slug>/stories.md`         |
| 3     | `/create-scenarios <slug>`     | `docs/features/<slug>/scenarios.feature`  |
| 4     | `/create-reqs <slug>`          | `docs/features/<slug>/requirements.md`    |
| 5     | `/create-nf-reqs <slug>`       | `docs/features/<slug>/nf-requirements.md` |
| 5     | `/extract-views <slug>`        | `docs/features/<slug>/views`              |
| 6     | `/create-design <slug>`        | `docs/features/<slug>/design.md`          |
| 7     | `/create-test-strategy <slug>` | `docs/features/<slug>/test-strategy.md`   |
| 8     | `/create-tasks <slug>`         | `docs/features/<slug>/tasks.md`           |
| 9     | `/implement <slug>`            | código de produção + testes               |

## Comandos e Agentes Disponíveis

### Comandos (slash commands)

| Comando                 | Descrição                                                               |
| ----------------------- | ----------------------------------------------------------------------- |
| `/create-prd`           | Cria o PRD da feature de forma incremental                              |
| `/create-user-stories`  | Cria as user stories a partir do PRD                                    |
| `/create-scenarios`     | Cria cenários BDD (Gherkin) a partir do PRD e stories                   |
| `/extract-views`        | Extrai telas dos cenários BDD e gera um `tela.md` por tela identificada |
| `/create-reqs`          | Cria requisitos funcionais no formato EARS                              |
| `/create-nf-reqs`       | Cria requisitos não funcionais                                          |
| `/create-constitution`  | Cria/atualiza `docs/constitution.md`                                    |
| `/create-design-system` | Cria/atualiza `docs/design-system`                                      |
| `/create-design`        | Cria o documento de design técnico                                      |
| `/create-test-strategy` | Cria a estratégia de testes                                             |
| `/create-tasks`         | Gera tasks de implementação organizadas por requisito                   |
| `/implement`            | Implementa tasks de forma incremental (uma por vez)                     |
| `/commit`               | Sugere mensagem de commit no padrão conventional commits (PT-BR)        |

### Agentes disponíveis

Os comandos acima delegam para agentes especializados em `.claude/agents/`. Cada agente conduz uma entrevista incremental — artefato por artefato — e salva o resultado em `docs/features/<slug>/`.

## Regras de Implementação

As regras estão em `docs/consitution.md`;

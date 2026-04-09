# Tipografia

## Famílias de Fonte

| Família | Variável CSS / Classe | Uso |
|---------|----------------------|-----|
| Sans (Sistema) | `font-sans` / `var(--font-sans)` | Texto geral, interfaces, corpo do documento |
| Mono (Sistema) | `font-mono` | Código, dados técnicos, IDs, valores estruturados |

> **Nota**: O projeto herda as fontes do sistema do navegador via Tailwind padrão. Para usar fontes customizadas, configurar em `next.config.ts` com `next/font/google` ou `next/font/local`.

## Escala Tipográfica

| Nível | Classe Tailwind | Tamanho | Peso | Line Height | Uso |
|-------|----------------|---------|------|-------------|-----|
| Display | `text-4xl font-bold` | 36px | 700 | 1.2 (leading-9) | Títulos de página hero, landing pages |
| H1 | `text-3xl font-bold` | 30px | 700 | 1.25 (leading-9) | Título principal de página |
| H2 | `text-2xl font-semibold` | 24px | 600 | 1.3 (leading-8) | Seções principais, divisores de conteúdo |
| H3 | `text-xl font-semibold` | 20px | 600 | 1.4 (leading-7) | Subseções, cards de destaque |
| H4 | `text-lg font-semibold` | 18px | 600 | 1.4 (leading-7) | Subseções menores, labels de grupos |
| Body | `text-base` | 16px | 400 | 1.5 (leading-6) | Texto corrido, parágrafos, conteúdo principal |
| Body Small | `text-sm` | 14px | 400 | 1.5 (leading-6) | Descrições, subtextos, ajuda contextual |
| Caption | `text-xs` | 12px | 400 | 1.4 (leading-5) | Legendas, metadados, datas, IDs |

## Variantes de Peso

| Peso | Classe Tailwind | Quando usar |
|------|-----------------|------------|
| 400 (Normal) | `font-normal` | Texto corpo, conteúdo regular |
| 500 (Medium) | `font-medium` | Botões, labels, destaque suave |
| 600 (Semibold) | `font-semibold` | Títulos secundários (H3+), labels de campo |
| 700 (Bold) | `font-bold` | Títulos principais (H1, H2, Display), ênfase |

## Regras de Uso

1. **Nunca usar tamanhos arbitrários** — sempre escolher um nível da escala acima.
2. **Hierarquia visual clara**: cada nível deve ser visualmente distinto do anterior (não mudar apenas cor).
3. **Display para destaque máximo**: usar apenas em hero sections ou headlines de primeira importância.
4. **H1 para página**: cada página tem exatamente 1 H1 (melhor prática de acessibilidade).
5. **Body para conteúdo**: parágrafos, listas e conteúdo contínuo sempre em `text-base` (16px) ou `text-sm` (14px).
6. **Caption para metadados**: datas, IDs, números de linha — sempre em `text-xs` (12px).
7. **Peso semibold (+) para heading**: títulos sempre com peso ≥ 600.
8. **Peso normal para corpo**: conteúdo corrido sempre em `font-normal` (400) ou `font-medium` (500).

## Line Height

Tailwind define line heights via classe `leading-*`:
- `leading-5`: 1.25 (12px)
- `leading-6`: 1.5 (16px)
- `leading-7`: 1.75 (20px)
- `leading-8`: 2 (24px)
- `leading-9`: 2.25 (28px)

**Padrão**: usar `leading-6` (1.5) para corpo, `leading-7` (1.75) para títulos menores, `leading-9` (2.25) para Display.

## Espaçamento Tipográfico

Não adicionar `margin-bottom` arbitrário após parágrafos — usar sistema de espaçamento de `spacing.md`:
- Entre parágrafos: `mb-4` (16px)
- Entre seções com H2: `mb-6` ou `mb-8` (24px ou 32px)
- Entre items de lista: `gap-2` ou `gap-3` (8px ou 12px)

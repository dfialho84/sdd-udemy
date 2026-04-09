# Espaçamento

## Escala Base

O projeto usa a **escala padrão do Tailwind (base 4px)** — definindo espaçamento via classes de utilidade Tailwind e variáveis CSS quando necessário.

| Token | Classe Tailwind | Valor | Referência de uso | Uso típico |
|-------|-----------------|-------|------------------|------------|
| xs | `p-1`, `gap-1`, `m-1` | 4px | Padding: `p-1`, Gap: `gap-1` | Espaçamento mínimo, espacinho em badges, ícones |
| sm | `p-2`, `gap-2`, `m-2` | 8px | Padding: `p-2`, Gap: `gap-2` | Espaçamento interno de componentes pequenos, botões ícone |
| md | `p-3`, `gap-3`, `m-3` | 12px | Padding: `p-3`, Gap: `gap-3` | Padding de inputs, selects, pequenos cards |
| lg | `p-4`, `gap-4`, `m-4` | 16px | Padding: `p-4`, Gap: `gap-4` | Padding padrão de cards, seções, contenedores normais |
| xl | `p-6`, `gap-6`, `m-6` | 24px | Padding: `p-6`, Gap: `gap-6` | Padding de containers principais, espaçamento entre blocos |
| 2xl | `p-8`, `gap-8`, `m-8` | 32px | Padding: `p-8`, Gap: `gap-8` | Espaçamento entre seções de conteúdo principal |
| 3xl | `p-12`, `gap-12`, `m-12` | 48px | Padding: `p-12`, Gap: `gap-12` | Espaçamento de blocos grandes, hero sections |
| 4xl | `p-16`, `gap-16`, `m-16` | 64px | Padding: `p-16`, Gap: `gap-16` | Espaçamento vertical de seções hero, página inteira |

> **Nota**: Tailwind oferece mais tokens (`2`, `3`, `4`, `5`, `7`, `9`, `10`, `11`, `14`, `18`, `20`, `24`, `28`, `32`, `36`, `40`, `44`, `48`, `52`, `56`, `60`, `64`, `72`, `80`, `96`). A tabela acima lista os mais comuns. Para tamanhos arbitrários fora da escala, usar `p-[Npx]`.

## Regras de Uso

1. **Padding interno de componentes**: xs–lg (`p-1` a `p-4`)
   - Botão: `p-2` (8px) a `p-4` (16px)
   - Input/Select: `p-2` a `p-3` (8px–12px)
   - Card: `p-4` ou `p-6` (16px–24px)

2. **Gap entre elementos de lista/grid**: xs–sm (`gap-1` a `gap-2`)
   - Items em linha: `gap-2` ou `gap-3`
   - Grid de cards: `gap-4` ou `gap-6`

3. **Padding de containers/páginas**: xl–2xl (`p-6` a `p-8`)
   - Contenedor principal: `p-6` ou `p-8`
   - Página inteira: lateral `px-6` ou `px-8`, vertical `py-6` a `py-12`

4. **Margin entre seções**: lg–3xl (`m-4` a `m-12`)
   - Entre cards: `mb-4` (16px)
   - Entre seções: `mb-6` a `mb-8` (24px–32px) ou `my-8` a `my-12`

5. **Nunca usar valores arbitrários sem justificativa** — ajustar para o token mais próximo da escala.

## Border Radius

O projeto define escalas de border-radius baseadas em múltiplos de `--radius: 0.625rem (10px)`:

| Token | Classe Tailwind | Valor | Uso |
|-------|-----------------|-------|-----|
| sm | `rounded-sm` | 6px (~0.6 × 10px) | Pequenos componentes, ícones arredondados |
| md | `rounded-md` | 8px (~0.8 × 10px) | Inputs, small buttons, subtle components |
| lg | `rounded-lg` | 10px (1 × 10px, padrão) | Buttons, cards, popovers |
| xl | `rounded-xl` | 14px (~1.4 × 10px) | Modals, major components |
| 2xl | `rounded-2xl` | 18px (~1.8 × 10px) | Hero sections, large cards |
| 3xl | `rounded-3xl` | 22px (~2.2 × 10px) | Muito raro, apenas para efeitos especiais |
| 4xl | `rounded-4xl` | 26px (~2.6 × 10px) | Muito raro, apenas para efeitos especiais |

**Regra**: usar `rounded-lg` como padrão para componentes normais; ajustar para `md` em componentes apertados ou `xl` em modais/popovers.

## Container e Layout

- **Container máximo**: Tailwind padrão sem limite específico — usar `max-w-screen-xl` (1280px) para conteúdo principal ou `max-w-full` para full-bleed.
- **Colunas/Grid**: padrão Tailwind — gap `gap-4` a `gap-6` entre colunas.
- **Viewport padding**: `px-4` a `px-8` em pequenas/médias telas; `px-8` a `px-12` em grandes telas.

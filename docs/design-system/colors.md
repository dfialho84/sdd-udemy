# Cores

## Paleta Semântica

Cores com significado funcional — usadas via variáveis CSS ou classes Tailwind.

| Token | Valor (Light) | Valor (Dark) | Classe Tailwind | Uso |
|-------|---------------|--------------|-----------------|-----|
| background | oklch(1 0 0) | oklch(0.145 0 0) | `bg-background` | Fundo principal da página e componentes |
| foreground | oklch(0.145 0 0) | oklch(0.985 0 0) | `text-foreground` | Texto principal do documento |
| primary | oklch(0.205 0 0) | oklch(0.922 0 0) | `bg-primary` / `text-primary` | Ações principais, CTAs, foco visual |
| primary-foreground | oklch(0.985 0 0) | oklch(0.205 0 0) | `text-primary-foreground` | Texto sobre fundo primary |
| secondary | oklch(0.97 0 0) | oklch(0.269 0 0) | `bg-secondary` / `text-secondary` | Ações secundárias, alternativas |
| secondary-foreground | oklch(0.205 0 0) | oklch(0.985 0 0) | `text-secondary-foreground` | Texto sobre fundo secondary |
| accent | oklch(0.97 0 0) | oklch(0.269 0 0) | `bg-accent` / `text-accent` | Destaques, hover states, enfoque |
| accent-foreground | oklch(0.205 0 0) | oklch(0.985 0 0) | `text-accent-foreground` | Texto sobre fundo accent |
| destructive | oklch(0.577 0.245 27.325) | oklch(0.704 0.191 22.216) | `bg-destructive` / `text-destructive` | Ações destrutivas, erros, alertas críticos |
| muted | oklch(0.97 0 0) | oklch(0.269 0 0) | `bg-muted` | Fundos sutis, conteúdo desabilitado, placeholder |
| muted-foreground | oklch(0.556 0 0) | oklch(0.708 0 0) | `text-muted-foreground` | Texto secundário, metadados, dicas |
| border | oklch(0.922 0 0) | oklch(1 0 0 / 10%) | `border-border` | Bordas de componentes, divisores |
| input | oklch(0.922 0 0) | oklch(1 0 0 / 15%) | `border-input` | Bordas de inputs, textareas |
| ring | oklch(0.708 0 0) | oklch(0.556 0 0) | `ring-ring` | Foco visível (acessibilidade outline) |
| card | oklch(1 0 0) | oklch(0.205 0 0) | `bg-card` | Fundo de cards e contenedores elevados |
| card-foreground | oklch(0.145 0 0) | oklch(0.985 0 0) | `text-card-foreground` | Texto em cards |
| popover | oklch(1 0 0) | oklch(0.205 0 0) | `bg-popover` | Fundo de popovers, dropdowns, modais |
| popover-foreground | oklch(0.145 0 0) | oklch(0.985 0 0) | `text-popover-foreground` | Texto em popovers |

## Paleta de Suporte

### Charts
Para visualizações de dados e gráficos:

| Token | Valor | Uso |
|-------|-------|-----|
| chart-1 | oklch(0.87 0 0) | Primeira série de dados |
| chart-2 | oklch(0.556 0 0) | Segunda série de dados |
| chart-3 | oklch(0.439 0 0) | Terceira série de dados |
| chart-4 | oklch(0.371 0 0) | Quarta série de dados |
| chart-5 | oklch(0.269 0 0) | Quinta série de dados |

### Sidebar
Para componentes de navegação lateral:

| Token | Valor (Light) | Valor (Dark) | Uso |
|-------|---------------|--------------|-----|
| sidebar | oklch(0.985 0 0) | oklch(0.205 0 0) | Fundo da sidebar |
| sidebar-foreground | oklch(0.145 0 0) | oklch(0.985 0 0) | Texto na sidebar |
| sidebar-primary | oklch(0.205 0 0) | oklch(0.488 0.243 264.376) | Item ativo na sidebar |
| sidebar-primary-foreground | oklch(0.985 0 0) | oklch(0.985 0 0) | Texto do item ativo |
| sidebar-accent | oklch(0.97 0 0) | oklch(0.269 0 0) | Hover na sidebar |
| sidebar-accent-foreground | oklch(0.205 0 0) | oklch(0.985 0 0) | Texto no hover |
| sidebar-border | oklch(0.922 0 0) | oklch(1 0 0 / 10%) | Bordas na sidebar |
| sidebar-ring | oklch(0.708 0 0) | oklch(0.556 0 0) | Foco na sidebar |

## Regras de Uso

1. **Nunca usar valores hex ou oklch diretamente no código** — sempre via classe Tailwind (`bg-primary`, `text-destructive`, etc.) ou variável CSS (`var(--primary)`, `var(--destructive)`, etc.).
2. **Cores semânticas têm precedência** — usar `primary`, `destructive` e `accent` conforme seu significado, não conforme aparência.
3. **Background + Foreground sempre em par** — ao escolher `bg-primary`, usar `text-primary-foreground` para o texto.
4. **Contraste mínimo obrigatório:**
   - primary sobre background: contraste 7:1 (light) e 6:1 (dark) — WCAG AAA
   - destructive sobre background: contraste 5:1 — WCAG AA
   - muted-foreground sobre background: contraste 4.5:1 — WCAG AA
5. **Muted para conteúdo terciário** — nunca usar primary ou secondary para metadados, placeholders ou texto desabilitado.
6. **Ring apenas para foco** — nunca usar como cor de borda regular; usar `border` para isso.

## Espaço de Cor

O projeto usa **OKLch** como espaço de cor principal. Todos os valores são definidos em `oklch(lightness saturation hue)` onde:
- **Lightness (L)**: 0 a 1 (0 = preto, 1 = branco)
- **Saturation (C)**: 0 a ~0.4 em um anel de cores vibrantes
- **Hue (H)**: 0 a 360 graus

Essa escolha oferece percepção de cor mais uniforme do que rgb/hex tradicionais.

## Acessibilidade

- **Teste de contraste**: usar ferramenta de contraste WCAG (ex: WebAIM Color Contrast Checker)
- **Não confie apenas em cor**: sempre acompanhar de ícone, forma ou texto para diferenciar estado
- **Paleta neutro-first**: variantes de cinza e brilho primeiro; cores vibrantes apenas para semântica

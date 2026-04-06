# Guia de Entrevista — Design System

## Princípios

1. **Extraia antes de perguntar.** `tailwind.config.ts` e `globals.css` são a fonte primária. Se está lá, não pergunte.
2. **Uma pergunta por vez.**
3. **Perguntas são sobre decisões não tomadas** — não sobre o que já está configurado.

---

## Banco de perguntas por arquivo

### colors.md

Use quando as cores não estão no tailwind.config ou CSS.

- "O projeto tem uma cor de marca principal? Pode ser um hex, HSL ou nome de cor do Tailwind."
- "Há uma cor para estados de erro/destrutivo, ou usamos o padrão vermelho do shadcn?"
- "O projeto vai ter modo escuro? Isso impacta se definimos as cores como variáveis CSS ou valores fixos."

### typography.md

Use quando fontes não estão configuradas no projeto.

- "Há uma fonte específica para este projeto ou usamos a sans-serif padrão do sistema?"
- "O projeto tem um nível tipográfico de 'display' (títulos grandes de hero) ou começa no H1?"

### spacing.md

Use quando o projeto tem espaçamentos customizados não óbvios.

- "O projeto usa a escala padrão do Tailwind (base 4px) ou tem uma escala customizada?"
- "Qual é o padding padrão dos containers de página? (ex: `px-4` mobile, `px-8` desktop)"

### components.md

Use para decisões de uso de componentes não deriváveis do código.

- "Quando usar botão `outline` vs. `ghost`? Há uma regra no projeto?"
- "O projeto tem um componente de estado vazio (EmptyState) reutilizável ou cada feature cria o seu?"
- "Há outros componentes compostos que aparecem em mais de uma tela além de PageHeader e EmptyState?"
- "Qual o comportamento padrão de loading — skeleton (preserva layout) ou spinner (substitui conteúdo)?"

### themes.md

Use quando a estratégia de temas não está clara no código.

- "O projeto vai suportar modo escuro desde o início ou é pós-MVP?"
- "A troca de tema é manual (botão na UI) ou segue a preferência do sistema operacional?"

---

## O que não perguntar

- Valores que estão no `tailwind.config.ts` — extraia diretamente
- Variáveis CSS que estão no `globals.css` — extraia diretamente
- Componentes shadcn instalados — liste com `Glob src/components/ui/`
- Se o shadcn está configurado — leia o `components.json`

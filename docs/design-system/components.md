# Componentes

## Componentes Base

### Button

**Variantes:**

| Variante | Referência (prop) | Quando usar |
|----------|-------------------|------------|
| default | `variant="default"` | Ação principal da tela — máximo 1 por seção visual |
| outline | `variant="outline"` | Ação secundária, alternativa à principal sem preenchimento |
| secondary | `variant="secondary"` | Ação secundária com preenchimento (menos destaque que primary) |
| ghost | `variant="ghost"` | Ações em toolbars, menus, áreas densas — minimal visual |
| destructive | `variant="destructive"` | Ações irreversíveis (deletar, cancelar, limpar) |
| link | `variant="link"` | Navegação inline no texto, sem contorno |

**Tamanhos:**

| Tamanho | Referência (prop) | Altura | Padding horizontal | Uso |
|---------|-------------------|--------|------------------|-----|
| xs | `size="xs"` | 24px | 8px | Botões minúsculos, controladores inline |
| sm | `size="sm"` | 28px | 10px | Botões pequenos, ações secundárias |
| default | `size="default"` | 32px | 10px | Tamanho padrão, recomendado |
| lg | `size="lg"` | 36px | 10px | Botões de destaque, CTAs principais |
| icon | `size="icon"` | 32px × 32px | Quadrado | Ícone somente, ações inline |
| icon-xs | `size="icon-xs"` | 24px × 24px | Quadrado | Ícone minúsculo |
| icon-sm | `size="icon-sm"` | 28px × 28px | Quadrado | Ícone pequeno |
| icon-lg | `size="icon-lg"` | 36px × 36px | Quadrado | Ícone grande |

**Estados obrigatórios:**

- **Default**: apresentação normal
- **Hover**: feedback visual de interatividade (background alterado, som opcional)
- **Active/Pressed**: feedback de clique (transform suave ou background mais escuro)
- **Focus**: ring visível via `focus-visible:border-ring focus-visible:ring-3` — obrigatório para acessibilidade
- **Disabled**: `disabled` prop — opacidade reduzida (0.5), `pointer-events-none` — nunca sem feedback visual
- **Loading**: `disabled` + spinner interno ou skeleton — nunca remover o botão, manter espaço reservado
- **Invalid/Error**: `aria-invalid` — borda destrutiva + ring vermelho

**Acessibilidade:**

- Todo button tem texto ou `aria-label` descritivo
- Usar `aria-expanded` em buttons que abrem/fecham menus ou painéis
- Usar `aria-pressed` em buttons toggle
- Usar `aria-haspopup` em buttons que abrem popovers/menus

**Regras:**

1. Nunca mais de um botão `default` por seção visual — usa atenção do usuário
2. Botões destrutivos sempre pedem confirmação — modal ou popover "Tem certeza?"
3. Não usar cor sozinha para transmitir estado — sempre acompanhar com ícone ou texto
4. Loading state: manter espaço reservado (height), mostrar spinner ou skeleton
5. Desabilitado: sempre com tooltip se a razão não for óbvia

**Exemplo de uso:**
```tsx
import { Button } from "@/components/ui/button"

// Primary action
<Button variant="default" size="lg">Criar Usuário</Button>

// Secondary action
<Button variant="outline" size="default">Cancelar</Button>

// Icon button
<Button variant="ghost" size="icon">
  <Trash2Icon />
</Button>

// Destructive
<Button variant="destructive" onClick={handleDelete}>
  Deletar Permanentemente
</Button>
```

---

## Componentes Compostos Reutilizáveis

> **Nota**: Nesta fase inicial do projeto, nenhum componente composto foi criado. A seguir está o padrão esperado para futuros compostos.

### PageHeader (padrão esperado)

Usado em: todas as páginas principais.

**Props esperadas:**
```tsx
interface PageHeaderProps {
  title: string              // Título da página (H1)
  description?: string       // Subtítulo opcional
  action?: React.ReactNode   // Botão de ação opcional (ex: "Criar novo")
}
```

**Estrutura:**
```tsx
<PageHeader
  title="Quadros de Sprint"
  description="Gerenciar sprints ativas"
  action={<Button>Nova Sprint</Button>}
/>
```

**Regras:**
- Sempre no topo do conteúdo principal, abaixo da navegação
- Title é H1 automaticamente (acessibilidade)
- Description em `text-muted-foreground` (cinza secundário)
- Action alinhado à direita, usando Button `default`

### EmptyState (padrão esperado)

Usado quando: lista ou resultado de busca está vazio.

**Props esperadas:**
```tsx
interface EmptyStateProps {
  icon: React.ReactNode       // Ícone ilustrativo (lucide)
  title: string               // Título descritivo
  description?: string        // Contexto adicional
  action?: React.ReactNode    // Botão de ação (ex: "Criar novo")
}
```

**Estrutura:**
```tsx
<EmptyState
  icon={<InboxIcon />}
  title="Nenhuma sprint criada"
  description="Comece criando sua primeira sprint"
  action={<Button>Nova Sprint</Button>}
/>
```

**Regras:**
- Sempre centralizado na área de conteúdo
- Ícone em cor `muted` (gris) — nunca cor primária
- Title em H2 (`text-2xl font-semibold`)
- Description em `text-muted-foreground`

### LoadingSpinner / Skeleton (padrão esperado)

**LoadingSpinner**: para carregamento de página inteira ou ação de botão.
```tsx
<LoadingSpinner size="lg" />  // default, sm, lg
```

**Skeleton**: para carregamento de conteúdo que vai aparecer (preserva layout).
```tsx
<Skeleton className="h-10 w-full rounded-lg" />
```

**Regras:**
- Spinner: usar apenas em loading global (overlay) ou botão com state
- Skeleton: usar para simular componentes (card skeleton, list skeleton)
- Nunca mostrar ambos — escolher conforme contexto

---

## Componentes Detectados

**Base UI (shadcn/ui):**
- Button (implementado)

**Lucide Icons:**
- Disponível via `lucide-react` — usar em buttons, headers, empty states

> **Próximos componentes esperados** (conforme features):
> - Input (formulários)
> - Select / Combobox (seleções)
> - Modal / Dialog (confirmações, formulários)
> - Card (containers)
> - Badge (status, tags)
> - Tooltip (ajuda contextual)
> - Sidebar (navegação lateral)
> - Breadcrumb (navegação de hierarquia)
> - Tabs / Accordion (organização de conteúdo)
> - Table (dados estruturados)

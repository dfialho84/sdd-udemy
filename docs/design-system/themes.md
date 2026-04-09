# Temas

## Temas Disponíveis

| Tema | Seletor CSS | Ativo quando |
|------|-----------|--------------|
| Light | `:root` (padrão) | Preferência do sistema `light` ou seleção manual do usuário |
| Dark | `.dark` | Preferência do sistema `dark` ou seleção manual do usuário |

## Variáveis CSS por Tema

Todas as variáveis abaixo são definidas em `src/app/globals.css` e divididas entre `:root` (light) e `.dark`:

| Variável CSS | Valor Light | Valor Dark | Token semântico | Uso |
|--------------|-------------|-----------|-----------------|-----|
| `--background` | oklch(1 0 0) | oklch(0.145 0 0) | `bg-background` | Fundo principal |
| `--foreground` | oklch(0.145 0 0) | oklch(0.985 0 0) | `text-foreground` | Texto principal |
| `--primary` | oklch(0.205 0 0) | oklch(0.922 0 0) | `bg-primary` | Ação principal |
| `--primary-foreground` | oklch(0.985 0 0) | oklch(0.205 0 0) | `text-primary-foreground` | Texto sobre primary |
| `--secondary` | oklch(0.97 0 0) | oklch(0.269 0 0) | `bg-secondary` | Ação secundária |
| `--secondary-foreground` | oklch(0.205 0 0) | oklch(0.985 0 0) | `text-secondary-foreground` | Texto sobre secondary |
| `--accent` | oklch(0.97 0 0) | oklch(0.269 0 0) | `bg-accent` | Destaque |
| `--accent-foreground` | oklch(0.205 0 0) | oklch(0.985 0 0) | `text-accent-foreground` | Texto sobre accent |
| `--destructive` | oklch(0.577 0.245 27.325) | oklch(0.704 0.191 22.216) | `bg-destructive` | Ações destrutivas |
| `--muted` | oklch(0.97 0 0) | oklch(0.269 0 0) | `bg-muted` | Fundo sutil |
| `--muted-foreground` | oklch(0.556 0 0) | oklch(0.708 0 0) | `text-muted-foreground` | Texto secundário |
| `--border` | oklch(0.922 0 0) | oklch(1 0 0 / 10%) | `border-border` | Bordas |
| `--input` | oklch(0.922 0 0) | oklch(1 0 0 / 15%) | `border-input` | Bordas de inputs |
| `--ring` | oklch(0.708 0 0) | oklch(0.556 0 0) | `ring-ring` | Foco (acessibilidade) |
| `--card` | oklch(1 0 0) | oklch(0.205 0 0) | `bg-card` | Fundo de cards |
| `--card-foreground` | oklch(0.145 0 0) | oklch(0.985 0 0) | `text-card-foreground` | Texto em cards |
| `--popover` | oklch(1 0 0) | oklch(0.205 0 0) | `bg-popover` | Fundo de popovers |
| `--popover-foreground` | oklch(0.145 0 0) | oklch(0.985 0 0) | `text-popover-foreground` | Texto em popovers |
| `--chart-1` a `--chart-5` | (vários) | (vários) | `bg-chart-1` etc. | Dados/visualizações |
| `--sidebar` | oklch(0.985 0 0) | oklch(0.205 0 0) | `bg-sidebar` | Fundo da sidebar |
| `--sidebar-foreground` | oklch(0.145 0 0) | oklch(0.985 0 0) | `text-sidebar-foreground` | Texto na sidebar |
| `--sidebar-primary` | oklch(0.205 0 0) | oklch(0.488 0.243 264.376) | `bg-sidebar-primary` | Item ativo sidebar |
| `--sidebar-primary-foreground` | oklch(0.985 0 0) | oklch(0.985 0 0) | `text-sidebar-primary-foreground` | Texto item ativo |
| `--sidebar-accent` | oklch(0.97 0 0) | oklch(0.269 0 0) | `bg-sidebar-accent` | Hover sidebar |
| `--sidebar-accent-foreground` | oklch(0.205 0 0) | oklch(0.985 0 0) | `text-sidebar-accent-foreground` | Texto hover |
| `--sidebar-border` | oklch(0.922 0 0) | oklch(1 0 0 / 10%) | `border-sidebar-border` | Bordas sidebar |
| `--sidebar-ring` | oklch(0.708 0 0) | oklch(0.556 0 0) | `ring-sidebar-ring` | Foco sidebar |

## Como Adicionar um Novo Tema

1. **Criar seletor CSS** em `src/app/globals.css`:
   ```css
   .theme-brand {
     --background: oklch(...);
     --foreground: oklch(...);
     --primary: oklch(...);
     /* redefinir todos os tokens acima para a paleta do novo tema */
   }
   ```

2. **Aplicar no HTML root** via contexto React ou mecanismo de seleção:
   ```tsx
   // No componente Layout ou Provider
   <html className={isDarkMode ? "dark" : ""}>
     {/* ... */}
   </html>
   ```

3. **Testar contraste** das cores escolhidas no novo tema — usar WebAIM Color Contrast.

## Como o Projeto Ativa/Troca o Tema

**Estratégia atual:** classe CSS pura (`.dark`).

**Implementação esperada:**
- A biblioteca `next-themes` pode ser integrada para gerenciar persistência e sincronização entre abas
- Sem next-themes: usar `localStorage` + script de sincronização no `layout.tsx`

**Fluxo:**
1. Usuário seleciona tema (light/dark) em um seletor na UI
2. Classe `.dark` é adicionada/removida de `<html>`
3. CSS cascata redifine todas as variáveis automaticamente
4. Componentes reagem via `bg-background`, `text-foreground`, etc. (já mapeados)

**Exemplo de toggle:**
```tsx
"use client"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  const toggle = () => {
    const root = document.documentElement
    root.classList.toggle("dark")
    setIsDark(!isDark)
    localStorage.setItem("theme", isDark ? "light" : "dark")
  }

  return (
    <button onClick={toggle}>
      {isDark ? "Light" : "Dark"}
    </button>
  )
}
```

## Referência de Cores em OKLch

O projeto usa OKLch para todas as cores — um espaço de cor perceptualmente uniforme:

- **Lightness**: 0 (preto) a 1 (branco)
- **Chroma**: saturação 0 (~0.4 máximo vibrante)
- **Hue**: 0–360 graus

**Vantagens:**
- Transições de tema mais naturais
- Contraste mais previsível entre light/dark
- Melhor acessibilidade para daltônicos

**Conversão útil:**
- Para adicionar uma nova cor, usar ferramenta online OKLch ↔ RGB/Hex

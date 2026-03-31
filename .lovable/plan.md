

# Plano: Dark Mode Toggle no TopBar

## Resumo
Adicionar um botão toggle no TopBar que alterna entre modo claro (Sol) e escuro (Lua), persistindo a preferência no `localStorage`. O Tailwind já está configurado com `darkMode: ["class"]`.

## Mudanças

### 1. `src/index.css` — Adicionar variáveis dark mode
Adicionar bloco `.dark` com paleta escura emerald:
```css
.dark {
  --background: 210 29% 8%;
  --foreground: 150 10% 92%;
  --card: 210 25% 12%;
  --card-foreground: 150 10% 92%;
  --popover: 210 25% 12%;
  --popover-foreground: 150 10% 92%;
  --primary: 160 84% 39%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 20% 16%;
  --secondary-foreground: 150 10% 90%;
  --muted: 210 20% 18%;
  --muted-foreground: 220 9% 55%;
  --accent: 160 84% 39%;
  --accent-foreground: 0 0% 100%;
  --border: 210 20% 20%;
  --input: 210 20% 20%;
  --ring: 160 84% 39%;
  /* shadows, gradients, sidebar — same */
}
```

### 2. `src/components/TopBar.tsx` — Toggle com ícone dinâmico
- Importar `Sun` de lucide-react
- Ler tema inicial de `localStorage` e classe `dark` no `<html>`
- State `isDark` controlando toggle
- Ao clicar: toggle classe `dark` no `document.documentElement`, salvar em `localStorage`
- Ícone: `isDark ? Sun : Moon`

### Arquivos
- `src/index.css` — adicionar bloco `.dark`
- `src/components/TopBar.tsx` — lógica de toggle + ícone dinâmico


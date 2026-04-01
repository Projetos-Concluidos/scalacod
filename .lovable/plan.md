

# Fix Dashboard Layout — Completo e Funcional

## Problemas Identificados

1. **Sidebar não é fixa no desktop** — Usa `md:relative`, o que faz ela scrollar junto com o conteúdo. Deveria ser `fixed` sempre, com margin-left no conteúdo.
2. **"Sem dados ainda" aparece desnecessariamente** — O `EmptyState` aparece mesmo quando os gráficos e cards já estão visíveis (todos com zero). Isso é redundante e ocupa espaço inútil no final da página.
3. **TopBar não é sticky** — A barra superior scrolla junto com o conteúdo ao invés de ficar fixa no topo.

## Correções

### 1. AppLayout.tsx — Sidebar fixa + conteúdo com offset

A sidebar deve ser `fixed` no desktop também (não `relative`), e o conteúdo deve ter `md:ml-[220px]` para compensar.

```tsx
// AppLayout.tsx
<div className="flex min-h-screen w-full bg-background overflow-hidden">
  <AppSidebar />
  <div className="flex flex-1 flex-col min-w-0 md:ml-[220px]">
    <TopBar />  {/* sticky */}
    <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 md:px-6 lg:px-8 md:pb-8">
      <Outlet />
    </main>
  </div>
</div>
```

### 2. AppSidebar.tsx — Fixed em todas as telas

Remover `md:relative md:translate-x-0` e usar `fixed` sempre. No desktop sempre visível, no mobile toggle via state.

```tsx
// Mudar de:
"md:relative md:translate-x-0"
// Para:
"md:translate-x-0"
// (mantém fixed, apenas garante translate-x-0 no desktop)
```

### 3. TopBar.tsx — Sticky no topo

Adicionar `sticky top-0 z-30` ao TopBar para que fique sempre visível.

### 4. Dashboard.tsx — Remover EmptyState redundante

O bloco "Sem dados ainda" (linhas 355-361) é redundante quando os gráficos e cards de métricas já estão visíveis mostrando zeros. Remover completamente.

## Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `src/components/AppSidebar.tsx` | Manter `fixed` em todas as telas (remover `md:relative`) |
| `src/components/AppLayout.tsx` | Adicionar `md:ml-[220px]` no conteúdo |
| `src/components/TopBar.tsx` | Adicionar `sticky top-0 z-30` |
| `src/pages/Dashboard.tsx` | Remover bloco EmptyState redundante |


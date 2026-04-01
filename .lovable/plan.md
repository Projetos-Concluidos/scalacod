

## Plano: Fix "Failed to fetch dynamically imported module" (Erro Intermitente)

### Causa Raiz

Este erro ocorre quando o Vite faz hot-reload ou um novo deploy e os chunks antigos (URLs dos módulos lazy-loaded) ficam inválidos no cache do browser. O `lazy(() => import(...))` tenta buscar uma URL que não existe mais → falha → ErrorBoundary mostra "Algo deu errado".

É um problema **conhecido** do Vite com code-splitting + lazy routes.

### Solução

Criar uma função `lazyWithRetry` que envolve cada `lazy()` com lógica de retry: se o import falhar, faz `window.location.reload()` uma única vez (usando sessionStorage para evitar loop infinito).

### Alterações

#### 1. `src/lib/lazyWithRetry.ts` — Nova utility (criar)

```typescript
import { lazy, ComponentType } from "react";

export function lazyWithRetry(
  factory: () => Promise<{ default: ComponentType<any> }>
) {
  return lazy(async () => {
    const key = "page-has-been-force-refreshed";
    try {
      return await factory();
    } catch (error) {
      const hasRefreshed = sessionStorage.getItem(key);
      if (!hasRefreshed) {
        sessionStorage.setItem(key, "true");
        window.location.reload();
        return { default: () => null }; // nunca renderiza
      }
      sessionStorage.removeItem(key);
      throw error; // ErrorBoundary captura
    }
  });
}
```

#### 2. `src/App.tsx` — Substituir `lazy()` por `lazyWithRetry()`

Trocar todas as 18 chamadas `lazy(() => import(...))` por `lazyWithRetry(() => import(...))`.

### Escopo
- 1 arquivo novo: `src/lib/lazyWithRetry.ts`
- 1 arquivo editado: `src/App.tsx`
- Sem banco, sem edge functions


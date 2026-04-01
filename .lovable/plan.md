

# Fix: Dashboard Descentralizado

## Causa Raiz

O `AppSidebar` usa `position: fixed` no mobile e `md:relative` no desktop. Quando `relative`, a sidebar **ocupa espaço no flex flow** (220px). Porém, o container de conteúdo em `AppLayout.tsx` também tem `md:ml-[220px]`, criando um **deslocamento duplo de 220px**.

Resultado: o conteúdo fica empurrado 220px para a direita, aparentando estar descentralizado.

## Correção

**Remover `md:ml-[220px]`** do div de conteúdo em `AppLayout.tsx`. A sidebar `md:relative` já ocupa seu espaço naturalmente no flex layout — o margin-left é redundante.

```text
Antes:  flex → [sidebar 220px relative] + [content ml-220px] = 440px de offset
Depois: flex → [sidebar 220px relative] + [content sem ml]   = correto
```

## Arquivo alterado

| Arquivo | Mudança |
|---------|---------|
| `src/components/AppLayout.tsx` | Remover `md:ml-[220px]` da div do conteúdo |


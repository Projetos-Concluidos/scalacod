

## Plano: Adicionar feedback visual ao botao de refresh

### Problema
O botao de refresh (RefreshCw) na linha 281 **funciona** — ele chama `refetch()` corretamente. Porem nao ha nenhum feedback visual (icone girando, loading state), entao parece que nao faz nada ao clicar.

### Correcao

**Arquivo: `src/pages/Pedidos.tsx`**

1. Extrair `isFetching` do `useQuery` (linha 96):
```typescript
const { data: orders = [], isLoading, isFetching, refetch } = useQuery({...});
```

2. Adicionar animacao de rotacao no icone quando `isFetching` (linha 281):
```tsx
<Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => refetch()} disabled={isFetching}>
  <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
</Button>
```

### Resultado
- Ao clicar, o icone gira enquanto os dados sao recarregados
- O botao fica desabilitado durante o fetch para evitar cliques multiplos
- Feedback visual claro de que a acao esta sendo executada


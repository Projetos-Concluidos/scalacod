

# Fix: Status Evolution API Sempre DESCONECTADO

## Causa Raiz

A tabela `whatsapp_instances` **não possui** um índice UNIQUE em `(user_id, provider)`. O edge function usa `upsert` com `onConflict: "user_id,provider"`, que falha silenciosamente porque não existe essa constraint. Resultado: nenhum registro é salvo no banco, e na recarga da página o status é sempre "desconectado".

## Solução

### 1. Migration: Adicionar UNIQUE constraint

```sql
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_user_provider_unique 
ON public.whatsapp_instances (user_id, provider);
```

### 2. Edge Function: Fallback para INSERT caso upsert falhe

No `evolution-instance/index.ts`, trocar os `upsert` por lógica de "select → update ou insert" para maior robustez, caso haja dados duplicados pré-existentes.

Alternativamente, manter o upsert mas garantir que a constraint existe (a migration resolve).

### 3. Adicionar console.log no cliente para debug

No `EvolutionTab.tsx`, adicionar logs na `fetchInstance` para capturar o resultado da query ao DB e da chamada de status ao edge function. Isso ajuda a diagnosticar problemas futuros.

## Arquivos alterados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar UNIQUE constraint em `(user_id, provider)` |
| `supabase/functions/evolution-instance/index.ts` | Adicionar fallback insert/update caso upsert falhe |
| `src/components/whatsapp/EvolutionTab.tsx` | Adicionar console.logs de debug na fetchInstance |


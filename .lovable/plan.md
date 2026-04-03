

## Plano: Corrigir verificacao de saude usando numero do banco de dados

### Problema

Ao clicar em "Verificar Saude", a Evolution API retorna `fetchInstances` sem o campo `owner` preenchido, resultando em `ownNumber = ""`. Como nenhum `test_phone` e passado pelo frontend, o array `numbersToCheck` fica vazio e a funcao retorna "Sem numeros disponiveis para verificar saude da sessao".

O numero conectado ja esta salvo no banco (`whatsapp_instances.phone_number`), mas nao esta sendo usado como fallback.

### Correcao

**1. Frontend (`EvolutionTab.tsx`)** — Passar `connectedPhone` como `test_phone` ao chamar a acao `health`:

```typescript
// Linha ~156: adicionar connectedPhone ao body
const data = await callEvolutionFunction("health", { test_phone: connectedPhone });
```

**2. Edge Function (`evolution-instance/index.ts`)** — Adicionar fallback: se `ownNumber` estiver vazio, buscar `phone_number` da tabela `whatsapp_instances`:

```typescript
// Dentro do bloco "health", apos tentar fetchInstances
if (!ownNumber) {
  const { data: wi } = await supabaseAdmin
    .from("whatsapp_instances")
    .select("phone_number")
    .eq("user_id", user.id)
    .eq("provider", "evolution")
    .maybeSingle();
  ownNumber = wi?.phone_number || "";
}
```

### Arquivos envolvidos
| Arquivo | Mudanca |
|---|---|
| `src/components/whatsapp/EvolutionTab.tsx` | Passar `connectedPhone` como `test_phone` |
| `supabase/functions/evolution-instance/index.ts` | Fallback para buscar numero do banco |

### Resultado
- O botao "Verificar Saude" sempre tera um numero para testar (vindo do frontend ou do banco)
- O campo "Numero conectado" exibira o valor correto


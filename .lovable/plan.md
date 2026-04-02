

## Plano: Corrigir Contabilização de Tokens de Voz

### Problema Identificado

Existem **8 arquivos de áudio gerados com sucesso** no storage, mas `total_used = 0` e `balance` nunca foi decrementado. A análise revelou 3 bugs:

1. **`add_tokens_to_user` não atualiza `balance`**: A função só incrementa `total_purchased` no ON CONFLICT, mas nunca toca em `balance`. Tokens comprados não ficam disponíveis para uso.

2. **Race condition no débito**: O `generate-audio` lê `balance` no início e escreve no final. Com múltiplas gerações simultâneas (7 em 2 segundos), os writes se sobrescrevem.

3. **Erro silencioso**: O resultado do `UPDATE` no débito nunca é verificado.

---

### Entrega 1: Migração - Funções atômicas de débito e crédito

Corrigir `add_tokens_to_user` para também atualizar `balance`:

```sql
CREATE OR REPLACE FUNCTION public.add_tokens_to_user(p_user_id uuid, p_amount integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.voice_tokens (user_id, total_purchased, total_used, balance)
  VALUES (p_user_id, p_amount, 0, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET total_purchased = COALESCE(voice_tokens.total_purchased, 0) + p_amount,
      balance = COALESCE(voice_tokens.balance, 0) + p_amount,
      updated_at = now();
END;
$$;
```

Criar nova função `debit_voice_tokens` para débito atômico:

```sql
CREATE OR REPLACE FUNCTION public.debit_voice_tokens(p_user_id uuid, p_amount integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE public.voice_tokens
  SET balance = balance - p_amount,
      total_used = COALESCE(total_used, 0) + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;
```

Corrigir saldo atual com base nos arquivos gerados:
```sql
UPDATE voice_tokens
SET balance = COALESCE(total_purchased, 0) - COALESCE(total_used, 0)
WHERE balance != (COALESCE(total_purchased, 0) - COALESCE(total_used, 0));
```

---

### Entrega 2: Edge Function `generate-audio` - Débito atômico

Substituir o bloco de débito manual (linhas 164-173) por chamada RPC:

```typescript
// Debit tokens atomically
const { data: debited, error: debitError } = await supabase.rpc("debit_voice_tokens", {
  p_user_id: userId,
  p_amount: tokensNeeded,
});
if (debitError || !debited) {
  return new Response(
    JSON.stringify({ error: "Tokens insuficientes ou erro ao debitar." }),
    { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

Mover a verificação de saldo para o débito atômico (a função SQL já valida `balance >= p_amount`), mantendo a validação prévia como "fast check" para evitar chamadas desnecessárias ao provedor TTS.

---

### Escopo
- **1 migração**: Corrige `add_tokens_to_user`, cria `debit_voice_tokens`, reconcilia saldos
- **1 edge function editada**: `generate-audio` (débito atômico via RPC)
- Funciona para qualquer provedor TTS (ElevenLabs, OpenAI)


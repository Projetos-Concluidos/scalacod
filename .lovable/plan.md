

## Plano: Corrigir erro 422 de data invalida na sincronizacao Logzz

### Problema
Quando o `logzz-create-order` envia um pedido para a Logzz, a `delivery_date` armazenada no pedido pode estar expirada (data passada). O codigo ja tenta re-validar via API da Logzz (step 4.5), mas se essa chamada falhar (ex: Cloudflare 403), ele envia a data antiga e recebe 422.

### Solucao

**Arquivo: `supabase/functions/logzz-create-order/index.ts`**

1. **Fallback robusto para data**: Se a re-validacao via API Logzz falhar (403, timeout, etc.), gerar automaticamente a proxima data util valida (D+2 a D+7, excluindo domingos) em vez de enviar a data expirada.

2. **Validacao local de data passada**: Antes de enviar, verificar se `finalDeliveryDate` e uma data futura. Se for passada, substituir pela proxima data util calculada localmente.

3. **Retry com nova data apos 422**: Se a Logzz retornar 422 com erro de data, recalcular a data para D+3 e tentar novamente uma vez.

### Detalhes tecnicos

```text
Fluxo atual:
  order.delivery_date (pode ser expirada)
  → API Logzz /delivery-day/ (pode falhar com 403)
  → envia data expirada → 422

Fluxo corrigido:
  order.delivery_date
  → API Logzz /delivery-day/ (tenta re-validar)
  → Se API falhar: calcular proxima data util (D+2, pula domingos)
  → Se data < hoje: substituir por data util calculada
  → Envia para Logzz
  → Se 422 com erro de data: recalcular D+3 e retry 1x
```

Funcao helper `getNextBusinessDate(daysAhead)`:
- Avanca N dias uteis a partir de hoje
- Pula domingos (padrao Logzz)
- Retorna formato YYYY-MM-DD

Alteracao na logica de envio (`sendToLogzz`):
- Apos receber 422, verificar se erro contem "delivery_date" ou "data"
- Se sim, recalcular data e fazer 1 retry automatico


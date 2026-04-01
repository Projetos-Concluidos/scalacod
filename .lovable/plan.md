

## Plano: Enviar pedidos para Logzz via `/api/v1/orders` (bypass Cloudflare)

### Diagnóstico

O endpoint webhook `/api/importacao-de-pedidos/webhook/ori1xzrv` está protegido por Cloudflare JS Challenge (403 "Just a moment..."). Nenhuma combinação de headers consegue passar — o Cloudflare exige execução de JavaScript, impossível em server-side fetch.

**Porém**: O endpoint `/api/v1/products` funciona perfeitamente (confirmado pelo "Testar Conexão" que retorna "✅ Conectado à Logzz! Token válido"). Isso significa que endpoints `/api/v1/` NÃO estão bloqueados pelo Cloudflare.

### Solução

Usar `POST https://app.logzz.com.br/api/v1/orders` em vez do webhook. Mesmo namespace API que `/api/v1/products`, mesmos headers:

```typescript
Authorization: Bearer ${token}  // Capital B, igual ao products
Accept: application/json
Content-Type: application/json
```

Payload idêntico ao formato do webhook (o screenshot mostra o mesmo formato JSON).

### Alterações

#### 1. `supabase/functions/checkout-api/index.ts`

**No `create_order`** (linhas ~263-276):
- Trocar `webhookUrl` por `https://app.logzz.com.br/api/v1/orders`
- Usar `Authorization: Bearer` (capital B)
- Remover `User-Agent` e `redirect: "manual"` (desnecessários para `/api/v1/`)

**No `send_to_logzz`** (linhas ~1095-1108):
- Mesma mudança: POST para `/api/v1/orders`
- Usar `Authorization: Bearer` (capital B)
- Remover `User-Agent` e `redirect: "manual"`
- Manter o `webhookUrl` do config como fallback (tentar primeiro `/api/v1/orders`, se falhar tenta webhook)

**Suporte a order bumps no payload**: Se o pedido tiver `order_bumps`, adicionar os campos `bumps` e `variations` conforme o formato da Logzz mostrado nos screenshots.

#### 2. Deploy + Teste Real

- Deploy da edge function
- Enviar pedido #C6Y7DN3Z via `send_to_logzz`
- Verificar se a Logzz recebe o pedido no painel de Remapeamento

### Justificativa técnica
- `/api/v1/products` (GET) = funciona ✅ (mesmo servidor, mesma auth)
- `/api/v1/orders` (POST) = deve funcionar ✅ (mesmo namespace API)
- `/api/importacao-de-pedidos/webhook/` = bloqueado por Cloudflare ❌


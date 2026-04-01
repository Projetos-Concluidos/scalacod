

## Plano: Adotar Arquitetura ScalaCOD para Envio de Pedidos à Logzz

### Diagnóstico

Comparando o código do outro projeto (ScalaCOD) com o nosso, identifiquei **3 diferenças críticas**:

1. **Arquitetura**: O ScalaCOD usa uma Edge Function **separada** (`logzz-create-order`) dedicada ao envio. Nosso código faz tudo dentro do `checkout-api`, o que dificulta retry e debug.

2. **Endpoint**: O ScalaCOD usa exclusivamente o **webhook de importação** (`/api/importacao-de-pedidos/webhook/{HASH}`), não a API v1. O nosso código atualmente tenta API v1 primeiro.

3. **Headers**: O ScalaCOD usa `Authorization: bearer` (lowercase) + User-Agent completo em TODAS as chamadas POST. Nosso `create_order` não inclui User-Agent e usa `Bearer` (uppercase).

### O que NÃO vamos copiar

O ScalaCOD usa `tenant_secrets` com criptografia `pgcrypto` + `job_queue` + `pg_cron`. Nosso projeto já tem uma tabela `integrations` funcional com tokens, e não precisa dessa complexidade adicional. Vamos manter nossa estrutura mas adotar o padrão de envio.

### Alterações

#### 1. Nova Edge Function: `logzz-create-order`

Criar `supabase/functions/logzz-create-order/index.ts` — função dedicada, idêntica ao padrão do ScalaCOD:

- Recebe `{ order_id, user_id }`
- Busca o pedido no banco (via service role)
- Busca token da integração Logzz do usuário
- Busca `logzz_webhook_url` da config (com fallback default)
- Monta payload no formato exato da Logzz (incluindo `bumps` e `variations` se houver)
- POST para o webhook com headers exatos: `Authorization: bearer {token}` + `User-Agent: Mozilla/5.0...` + `Accept: application/json`
- Se sucesso: atualiza `orders.status = "Agendado"` + `orders.logzz_order_id`
- Se erro: loga mas não muda status

#### 2. Atualizar `checkout-api/index.ts`

**No `create_order`** (linhas 229-309):
- Remover toda a lógica de envio direto para Logzz
- Substituir por uma chamada interna à nova `logzz-create-order`:
```typescript
// Chamar a edge function dedicada
await fetch(`${supabaseUrl}/functions/v1/logzz-create-order`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${serviceKey}`,
  },
  body: JSON.stringify({ order_id: inserted.id, user_id }),
});
```

**No `send_to_logzz`** (linhas 1040-1199):
- Simplificar: chamar a mesma `logzz-create-order` e retornar o resultado
- Remove as 3 tentativas com endpoints diferentes

#### 3. Payload exato (conforme documentação do ScalaCOD)

Sem order bumps:
```json
{
  "external_id": "uuid-do-pedido",
  "full_name": "NOME",
  "phone": "94992118777",
  "customer_document": "12345678900",
  "postal_code": "59015070",
  "street": "Rua X",
  "neighborhood": "Centro",
  "city": "Natal",
  "state": "rn",
  "house_number": "123",
  "complement": "",
  "delivery_date": "2026-04-05",
  "offer": "hash-da-oferta",
  "affiliate_email": ""
}
```

Com order bumps:
```json
{
  ...campos acima...,
  "variations": [
    { "hash": "prok19gm", "quantity": 1 }
  ],
  "bumps": [
    { "hash": "sal4qr92", "variations": [
      { "hash": "prony211", "quantity": 1 }
    ] }
  ]
}
```

#### 4. Headers exatos (anti-Cloudflare, padrão ScalaCOD)

```typescript
{
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Authorization": `bearer ${logzzToken}`,  // lowercase "bearer"
}
```

#### 5. Deploy + Teste Real

- Deploy das duas functions (`logzz-create-order` + `checkout-api`)
- Enviar pedido #C6Y7DN3Z via `send_to_logzz`
- Se 403 persistir: o hash `ori1xzrv` precisa ser verificado no painel Logzz

### Escopo
- 1 arquivo novo: `supabase/functions/logzz-create-order/index.ts`
- 1 arquivo editado: `supabase/functions/checkout-api/index.ts`
- Sem migrações de banco
- Deploy de 2 edge functions

### Nota importante
Se o 403 persistir mesmo após essas mudanças, o problema é de infraestrutura (Cloudflare bloqueando o IP range do Supabase para POST). Nesse caso, a solução será **verificar o hash do webhook no painel Logzz** ou solicitar whitelist de IP ao suporte Logzz.


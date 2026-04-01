

## Plano: Fluxo LOGZZ ↔ SCALANINJA + Frete Grátis + Taxas MP

### 4 Problemas a Resolver

1. **Pedidos não são enviados para a Logzz** — Quando um pedido é criado com `logistics_type: "logzz"`, ele fica apenas no banco local. Falta o POST para a URL de webhook da Logzz (`logzz_webhook_url`).
2. **Logzz order ID não aparece nos detalhes** — A coluna `logzz_order_id` existe mas nunca é preenchida e não é exibida na UI.
3. **Frete aparecendo no checkout** — O valor `R$ 24,98` está sendo cobrado quando deveria ser entrega grátis.
4. **Taxas do MercadoPago** — Falta configuração de taxa para cobrir custos do gateway.

---

### Alterações por arquivo

#### 1. `supabase/functions/checkout-api/index.ts`
- **Nova action `send_to_logzz`**: Após criar o pedido, envia para a Logzz via POST no `logzz_webhook_url` com payload no formato esperado pela API (external_id, full_name, phone, customer_document, postal_code, street, etc.)
- Captura o `logzz_order_id` da resposta e faz UPDATE no pedido local
- Atualiza status para "Agendado" se Logzz aceitar
- **Modificar action `create_order`**: Após inserir o pedido, se `logistics_type === "logzz"`, automaticamente chama a lógica de envio para Logzz e retorna o `logzz_order_id` junto com o `order_id`
- **Nova action `get_mp_fees`**: Retorna a taxa configurada na integração MP do tenant

#### 2. `src/pages/CheckoutPublic.tsx`
- **Frete grátis**: Alterar linha 278 — `shippingPrice` sempre `0` (remover cálculo de `selectedDate.price`)
- **Taxas MP**: Buscar taxa configurada do tenant ao carregar checkout. Somar taxa ao `totalPrice` quando provider é "coinzz"
- Exibir a taxa como linha separada no resumo do pedido ("Taxa de processamento: R$ X,XX")

#### 3. `src/pages/Pedidos.tsx` (Modal de detalhes)
- Na aba "Logística", exibir o `logzz_order_id` com link clicável para `https://app.logzz.com.br/meu-pedido/{logzz_order_id}`
- Ícone `ExternalLink` ao lado do link

#### 4. `src/components/settings/MercadoPagoTab.tsx`
- Adicionar campo "Taxa de processamento (%)" — input numérico (ex: 4.99)
- Salvar no config da integração como `{ access_token, public_key, processing_fee_percent }`
- Explicação: "Percentual adicionado ao valor do pedido para cobrir taxas do MercadoPago"
- Documentação inline: taxas do MP variam (PIX ~0.99%, Cartão ~4.99%, Boleto ~R$3.49)

### Formato do payload para a Logzz (webhook)
```json
{
  "external_id": "order-uuid",
  "full_name": "Nome Completo",
  "phone": "84999999999",
  "customer_document": "12345678900",
  "postal_code": "59015070",
  "street": "Rua ...",
  "neighborhood": "Bairro",
  "city": "Natal",
  "state": "rn",
  "house_number": "123",
  "complement": "",
  "delivery_date": "2026-04-05",
  "offer": "hash-da-oferta",
  "affiliate_email": ""
}
```

### Escopo controlado
- 4 arquivos: `checkout-api/index.ts`, `CheckoutPublic.tsx`, `Pedidos.tsx`, `MercadoPagoTab.tsx`
- Sem migrações (coluna `logzz_order_id` já existe)
- Sem mudanças em RLS ou outras páginas


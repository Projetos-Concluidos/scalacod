

## Plano: Teste Real LOGZZ ↔ SCALANINJA + Action send_to_logzz

### Situação Atual

- O pedido #C6Y7DN3Z (Rafael Gomes Costa, CEP 59015-070) existe no banco com `status: "Aguardando"` e `logzz_order_id: null`
- A lógica de envio para Logzz existe dentro do `create_order`, mas **não existe uma action `send_to_logzz`** separada para reenviar pedidos existentes
- O User-Agent + Authorization: Bearer já estão no código (linhas 264-269)
- O usuário confirmou que essa combinação de headers funciona no Cloudflare da Logzz

### Alterações

#### 1. `supabase/functions/checkout-api/index.ts`

Adicionar nova action `send_to_logzz` (antes do bloco `Invalid action` na linha 1036):

- Recebe `order_id` e `user_id`
- Busca o pedido completo no banco pelo `order_id`
- Busca o `offer.hash` se `offer_id` existir
- Monta o payload no formato Logzz (external_id, full_name, phone, etc.)
- Envia POST para `logzz_webhook_url` com headers `Authorization: Bearer` + `User-Agent: Mozilla/5.0 Chrome/120` + `Content-Type: application/json`
- Captura `logzz_order_id` da resposta
- Atualiza o pedido com `logzz_order_id` e `status: "Agendado"`
- Registra no `order_status_history`

Também atualizar o User-Agent no `create_order` (linha 267) de `"ScalaNinja/1.0"` para `"Mozilla/5.0 Chrome/120"` — para consistência com o header que funciona.

#### 2. Deploy + Teste Real

Após deploy:
- Enviar pedido #C6Y7DN3Z para Logzz via `send_to_logzz`
- Verificar se retorna `logzz_order_id`
- Confirmar que o status mudou para "Agendado"

#### 3. Atualizar Memory

Registrar que `Authorization: Bearer` + `User-Agent: Mozilla/5.0` é necessário para o webhook de importação da Logzz.

### Escopo
- 1 arquivo: `checkout-api/index.ts`
- Deploy da edge function
- Teste real com pedido existente


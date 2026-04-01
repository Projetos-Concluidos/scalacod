

## Plano: Botão "Testar Conexão" dispara evento de mapeamento na Logzz

### O que muda

O botão "Testar Conexão" no LogzzTab atualmente apenas verifica se o token é válido (GET `/api/v1/products`). O usuário quer que ele **envie um pedido de teste para o webhook de importação da Logzz**, disparando o evento de mapeamento no painel Logzz.

### Alterações

#### 1. `src/components/settings/LogzzTab.tsx`

- Renomear o botão de "Testar Conexão" para "Disparar Mapeamento"
- Alterar `handleTestConnection` para:
  1. Salvar a integração (como já faz)
  2. Em vez de chamar `test-integration`, chamar a edge function `logzz-create-order` com um payload de teste
  3. Ou, mais simples: fazer um POST direto para o webhook da Logzz com um pedido fictício de mapeamento (usando o token e a URL configurados)
- Exibir resultado: sucesso (Logzz recebeu o evento) ou erro (403, token inválido, etc.)

#### 2. Lógica do disparo

O botão chamará `checkout-api` com action `send_to_logzz` passando um `order_id` de teste, **ou** fará um POST direto via a edge function `logzz-create-order` com dados mínimos de mapeamento:

```json
{
  "external_id": "test-mapping-001",
  "full_name": "Teste Mapeamento",
  "phone": "11999999999",
  "postal_code": "59015070",
  "street": "Rua Teste",
  "neighborhood": "Centro",
  "city": "Natal",
  "state": "rn",
  "house_number": "1",
  "delivery_date": "2026-04-10",
  "offer": "hash-da-oferta"
}
```

**Abordagem preferida**: Criar uma nova action `test_logzz_mapping` no `checkout-api` que:
- Recebe `user_id` 
- Busca token + webhook URL da integração Logzz
- Envia payload de teste para o webhook com os headers corretos (`bearer` + `User-Agent`)
- Retorna o status da resposta da Logzz

Isso evita depender de um pedido existente no banco.

#### 3. `supabase/functions/checkout-api/index.ts`

Adicionar action `test_logzz_mapping`:
- Busca integração Logzz do usuário (token + webhook URL)
- Monta payload mínimo de teste
- POST para o webhook com headers exatos (lowercase `bearer`, User-Agent Mozilla)
- Retorna `{ success, status, response }` 

#### 4. UI no LogzzTab

- Botão: ícone `Truck` + texto "Disparar Mapeamento"
- Loading state durante o envio
- Resultado: badge verde "Evento enviado!" ou vermelho "Erro: 403 / token inválido"
- Manter o botão "Salvar" ao lado

### Escopo
- 2 arquivos: `LogzzTab.tsx`, `checkout-api/index.ts`
- Deploy da edge function `checkout-api`


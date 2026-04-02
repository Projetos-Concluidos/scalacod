

## Relatório Completo: Diagnóstico do Erro 422 Logzz

---

### Teste Real — CEP 51030050

Chamei a API da Logzz diretamente agora e ela retornou 3 datas disponíveis:

```text
1. 2026-04-04 (sáb) — type_code: det1pgz5, price: 24.98
2. 2026-04-06 (seg) — type_code: det1pgz5, price: 24.98
3. 2026-04-07 (ter) — type_code: det1pgz5, price: 24.98
```

Cada data inclui também: `local_operation_code: "loo9d006"`, `local_operation_name: "Recife"`.

### O que nosso sistema enviou (pedido WL20H5LQ)

```text
delivery_date: "2026-04-06"     ← está na lista de datas válidas ✓
delivery_type_code: "det1pgz5"  ← correto ✓
```

**Resultado**: Logzz retornou 422 — "A data de entrega não corresponde ao mapeamento."

### Diagnóstico

A data `2026-04-06` **está** na lista `dates_available` da API da Logzz. O `delivery_type_code` **está** correto. Mesmo assim, o webhook rejeita.

**Conclusão**: O webhook de importação (`ori1odgj` — "Scala Ninja Nova Integração") tem sua **própria configuração de mapeamento** que é diferente da API pública de datas. Isso é uma configuração no painel da Logzz que precisa ser verificada com o suporte deles.

No entanto, identifiquei **2 melhorias** que podemos fazer:

1. **Campo `local_operation_code` ausente**: A API retorna esse campo por data, mas não o enviamos no payload do webhook. Isso pode ser necessário para o mapeamento.
2. **Sem re-validação**: O pedido pode ser criado com uma data que já expirou entre o momento que o cliente viu e confirmou.

---

### Plano de Correção + Melhorias UI

#### 1. `supabase/functions/logzz-create-order/index.ts` — Re-validar data e enviar `local_operation_code`

Antes de enviar ao webhook, chamar a API `delivery-day/options/zip-code/{cep}` para:
- Verificar que a data selecionada ainda está disponível
- Capturar o `local_operation_code` correspondente
- Se a data original não estiver mais disponível, selecionar automaticamente a data mais próxima

Adicionar ao payload: `local_operation_code` e `local_operation_name`.

#### 2. `supabase/functions/checkout-api/index.ts` — Salvar `local_operation_code` no check_cep

No mapeamento de `dates_available`, incluir `local_operation_code` e `local_operation_name` para cada data.

#### 3. `src/pages/CheckoutPublic.tsx` — Enviar `local_operation_code` no pedido

Atualizar `DeliveryDate` interface para incluir `local_operation_code`. Enviar no payload de criação.

#### 4. `src/pages/Pedidos.tsx` — UI de erro detalhado + botão Reenviar

- No alerta de "Sincronização pendente", mostrar o erro específico da Logzz (ex: "Data de entrega não corresponde ao mapeamento")
- Adicionar botão "🔄 Reenviar para Logzz" no alerta
- Buscar o erro do `order_status_history` quando `logzz_order_id` é null

#### 5. Migração — Coluna `local_operation_code`

Adicionar coluna `local_operation_code text` na tabela `orders` (nullable).

---

### Arquivos alterados

1. `supabase/functions/logzz-create-order/index.ts` — Re-validação de data + local_operation_code no payload
2. `supabase/functions/checkout-api/index.ts` — Preservar local_operation_code no check_cep e create_order
3. `src/pages/CheckoutPublic.tsx` — Interface DeliveryDate + payload atualizado
4. `src/pages/Pedidos.tsx` — Erro detalhado + botão reenviar
5. Migração SQL — Coluna `local_operation_code`

### Nota importante

Mesmo com essas melhorias, se o webhook da Logzz continuar rejeitando datas que a própria API dela disponibiliza, o problema é na configuração do webhook no painel Logzz. Recomendo abrir um chamado com o suporte deles informando:
- Webhook: `ori1odgj`
- Data enviada: `2026-04-06` com `type_code: det1pgz5`
- API retorna essa data como disponível para CEP `51030050`
- Erro: "A data de entrega não corresponde ao mapeamento"


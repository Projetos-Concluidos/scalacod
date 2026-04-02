

## Relatório de Análise + Plano de Correção

---

### Diagnóstico do Status "Desconhecido" na Logzz

O pedido da Joana (28495537) **foi rejeitado pela Logzz** com erro 422:

```text
{"status":"error","message":"A data de entrega não corresponde ao mapeamento."}
```

Isso significa que a Logzz **recebeu** o payload (por isso aparece no "Histórico de Importações"), mas **não conseguiu processar** — a data de entrega `2026-04-07` não bate com as datas configuradas no mapeamento deles. Como a importação falhou, a Logzz marcou como "Desconhecido".

**Conclusão**: O status "Desconhecido" **não é um bug nosso**. É a Logzz indicando que recebeu dados mas não conseguiu importar. O problema está na configuração de mapeamento de datas na Logzz. Você precisa verificar com eles se as datas de entrega estão configuradas corretamente.

**O que aconteceu no nosso sistema**: Como a Logzz retornou 422 (erro), nosso código corretamente **não atualizou** o status para "Agendado" e o `logzz_order_id` ficou `null`. O pedido permanece como "Aguardando".

---

### Link do Pedido Logzz nos Detalhes

A funcionalidade **já está implementada** no código (linhas 625-630 de Pedidos.tsx). Quando o `logzz_order_id` existe, ele exibe:

```text
Pedido Logzz: #orddm259m [link clicável] [botão copiar]
```

O link direciona para `https://app.logzz.com.br/meu-pedido/{logzz_order_id}`.

**Por que não aparece**: O pedido da Joana foi **rejeitado** pela Logzz, então `logzz_order_id` é `null` — não há ID para exibir.

---

### Plano de Melhoria

Mesmo que o link já funcione, há melhorias úteis para quando a Logzz rejeita um pedido:

#### 1. Exibir erro de sincronização no detalhe do pedido

Quando `logzz_order_id` é null e `logistics_type === "logzz"`, mostrar um alerta informativo com o motivo da falha (ex: "Data de entrega não corresponde ao mapeamento") em vez de simplesmente não mostrar nada.

#### 2. Salvar o erro da Logzz no order_status_history

Atualmente quando a Logzz retorna erro (422, 502), o código retorna a resposta mas **não registra** no histórico. Registrar o erro permite debugar na timeline.

---

### Alterações

**`supabase/functions/logzz-create-order/index.ts`**:
- No bloco de erro (status != 2xx), inserir registro em `order_status_history` com `to_status: "logzz_error"` e o payload do erro

**`src/pages/Pedidos.tsx`**:
- Quando `logistics_type === "logzz"` e `logzz_order_id` é null e pedido não está cancelado, exibir badge "Logzz: Pendente" com botão de reenvio

Nenhuma migração necessária — a tabela `order_status_history` já suporta qualquer valor em `to_status` e `raw_payload`.


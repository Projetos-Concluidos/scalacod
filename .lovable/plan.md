

## Relatório: Análise Comparativa e Correção do Payload Logzz

---

### O que entendi do projeto que funciona (ScalaCOD)

O projeto ScalaCOD que funciona envia para o webhook da Logzz um payload **simples** com apenas `delivery_date` (YYYY-MM-DD). Ele **não** envia `delivery_type_code`, `local_operation_code` nem `local_operation_name` no payload do webhook.

### O que nosso sistema envia (e falha)

```text
Nosso payload atual:
  delivery_date: "2026-04-06"        ← correto
  delivery_type_code: "det1pgz5"     ← EXTRA - não existe no projeto que funciona
  local_operation_code: "loo9d006"    ← EXTRA - não existe no projeto que funciona
  local_operation_name: "Recife"     ← EXTRA - não existe no projeto que funciona
```

### Diagnóstico

O mapeamento no painel da Logzz para o webhook `ori1odgj` foi configurado usando o `test_logzz_mapping`, que envia **apenas** `delivery_date` (sem `delivery_type_code`). Quando enviamos campos extras no payload real, a Logzz pode estar interpretando `delivery_type_code` como um campo mapeado conflitante, gerando o erro 422 "A data de entrega não corresponde ao mapeamento."

A solução é **alinhar** nosso payload real com o padrão do projeto que funciona: enviar apenas `delivery_date` no webhook, sem campos extras de tipo/operação.

---

### Plano de Correção

#### 1. `supabase/functions/logzz-create-order/index.ts`
- **Remover** `delivery_type_code` do payload enviado ao webhook
- **Remover** `local_operation_code` e `local_operation_name` do payload
- Manter apenas `delivery_date` como campo de entrega (formato YYYY-MM-DD)
- Manter a re-validação da data (garantir que está disponível), mas usar o resultado apenas para atualizar o banco local, não enviar ao webhook
- Manter os campos `delivery_type_code` e `local_operation_code` salvos no banco (para referência interna)

#### 2. Sem outras alterações
- O checkout já funciona corretamente capturando `type_code` e salvando no banco
- A página de Pedidos não precisa de mudanças
- Sem migração necessária

---

### Resultado esperado

O payload enviado à Logzz ficará idêntico ao do projeto ScalaCOD que funciona:
```json
{
  "external_id": "...",
  "full_name": "...",
  "phone": "...",
  "delivery_date": "2026-04-06",
  "offer": "...",
  ...
}
```

Sem `delivery_type_code`, sem `local_operation_code`.


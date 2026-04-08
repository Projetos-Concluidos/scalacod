

## Relatorio: Por que o pedido nao foi atribuido ao afiliado na Logzz

### Diagnostico

Analisei o pedido #Q03XR8SB (ID: `046a0eca-121c-4f99-b235-d51db83fd44d`) e o payload enviado:

```text
Payload enviado para Logzz:
- offer: "sal6oxlk"           ← hash da oferta (correto)
- affiliate_code: "memdn8lr0" ← campo CUSTOMIZADO que adicionamos
- affiliate_email: null        ← campo vazio
- Resposta: 200 "Webhook processado com sucesso!"
```

### Causa raiz identificada

O campo `affiliate_code` que estamos enviando **nao e um campo reconhecido pela API de importacao de pedidos da Logzz**. A Logzz aceita e ignora campos desconhecidos — por isso retorna sucesso (200), mas nao atribui ao afiliado.

Analisando a documentacao da API de produtos que voce compartilhou, a estrutura e:

```text
data.producer[]   → produtos do produtor (com offers[].hash)
data.affiliate[]  → produtos do afiliado (com offers[].hash)
data.coproducer[] → produtos do coprodutor (com offers[].hash)
```

A questao critica: **a Logzz pode retornar hashes de oferta DIFERENTES** para cada papel. O hash `sal6oxlk` pode ser o hash do produtor, nao o hash do afiliado. Quando o pedido chega com o hash do produtor, a Logzz atribui ao produtor.

Alem disso, o campo que a Logzz reconhece para atribuicao de afiliado no webhook de importacao e provavelmente `affiliate_email` (email da conta do afiliado na Logzz), que esta sendo enviado como `null`.

### Dados confirmados no banco

| Campo | Valor |
|---|---|
| offer hash | sal6oxlk |
| affiliate_code | memdn8lr0 (salvo, mas ignorado pela Logzz) |
| scheduling_checkout_url | `https://entrega.logzz.com.br/pay/1-uni-organic-lizz-107` (URL de PRODUTOR, sem ID afiliado) |
| URL esperada afiliado | `https://entrega.logzz.com.br/pay/memdn8lr0/1-uni-organic-lizz-107` |

A URL armazenada e do produtor (sem segmento de afiliado), o que confirma que a API da Logzz retorna URLs de produtor mesmo para o array `affiliate`.

### Solucao proposta (3 acoes)

**1. Adicionar campo "Email do Afiliado" nas configuracoes Logzz**
- Novo campo no `LogzzTab.tsx` para o usuario informar o email da conta Logzz do afiliado
- Salvar como `affiliate_email` no config da integracao

**2. Enviar `affiliate_email` preenchido no payload**
- Em `logzz-create-order`, buscar o `affiliate_email` da integracao e enviar no payload
- Campo `affiliate_email` ja existe no payload, so esta `null`

**3. Investigar hashes de oferta por papel**
- Em `logzz-list-products`, logar os hashes separados por role (producer vs affiliate)
- Se a Logzz retornar hashes diferentes para afiliados, armazenar essa distincao
- Usar o hash correto do afiliado ao enviar o pedido

### Arquivos impactados

| Arquivo | Mudanca |
|---|---|
| `src/components/settings/LogzzTab.tsx` | Adicionar campo "Email do Afiliado Logzz" |
| `supabase/functions/logzz-create-order/index.ts` | Preencher `affiliate_email` do config |
| `supabase/functions/logzz-list-products/index.ts` | Logar hashes por role para diagnostico |

### Recomendacao imediata

Para confirmar qual campo a Logzz reconhece, sugiro:
1. Implementar o envio do `affiliate_email` (email da sua conta Logzz de afiliado)
2. Fazer um pedido teste
3. Se ainda nao atribuir, o proximo passo seria testar com um hash de oferta diferente (se existir um hash especifico do afiliado)




# Plano de Desenvolvimento — 8 Melhorias Pendentes do ScalaNinja

## Explicacao de cada item

**1. Indices de performance** — Adicionar indices no banco de dados nas colunas mais consultadas (user_id, created_at, status, phone, etc.) para acelerar queries de listagem, dashboard e filtros. Sem isso, conforme o volume de dados cresce, as paginas ficam lentas.

**2. Trigger updated_at** — A funcao `update_updated_at_column()` ja existe mas so esta vinculada a tabela `profiles`. Precisa ser vinculada a todas as tabelas que tem coluna `updated_at` (orders, leads, conversations, stores, integrations, flows, checkouts, whatsapp_instances, voice_tokens). Isso garante que o campo se atualiza automaticamente.

**3. Provider check real (Logzz)** — Hoje o checkout simula a verificacao de CEP com logica baseada no primeiro digito. Precisa criar uma edge function que faz a chamada real para `app.logzz.com.br/api/delivery-day/options/zip-code/{cep}` usando o token do usuario armazenado na tabela `integrations`.

**4. Pagamento Coinzz/MercadoPago** — Hoje o checkout Coinzz mostra UI simulada (QR code fake, formulario sem tokenizacao). Precisa criar edge functions que: (a) criam pagamento PIX no MercadoPago e retornam QR code real, (b) criam pedido na Coinzz via API real.

**5. Exportacao CSV** — Ja existe em Pedidos. Falta implementar em Leads (exportar leads filtrados) e potencialmente em Dashboard/Campanhas.

**6. Realtime automatico** — Os channels de realtime ja existem no codigo (Pedidos, Dashboard, Conversas), mas as tabelas `orders`, `conversations` e `messages` nao estao adicionadas a publication `supabase_realtime`. Sem isso, nenhum evento e disparado.

**7. Modal IA com Lovable AI** — Hoje o AIFlowModal gera fluxos com logica hardcoded (keyword matching). Precisa integrar com Lovable AI Gateway via edge function para gerar estrutura JSON de fluxos inteligentemente a partir da descricao do usuario.

**8. Templates sem submissao Meta** — A aba Templates mostra templates mas nao tem funcionalidade real de enviar templates para aprovacao na Meta via WhatsApp Cloud API. Precisa de edge function que chama `POST graph.facebook.com/v21.0/{waba_id}/message_templates`.

---

## Plano de Implementacao

### Step 1: Migration — Indices + Triggers + Realtime
Uma unica migration SQL que:
- Cria ~15 indices nas colunas mais usadas (user_id, created_at, status, phone, checkout_id, etc.)
- Vincula trigger `update_updated_at_column` a 9 tabelas
- Adiciona `orders`, `conversations`, `messages`, `leads` a `supabase_realtime`

### Step 2: Edge function `checkout-api`
Funcao que recebe acao no body:
- `check_delivery`: chama Logzz API real com token do usuario
- `create_pix`: chama MercadoPago para gerar QR code PIX
- `create_coinzz_order`: chama Coinzz API para criar pedido

Atualizar `CheckoutPublic.tsx` para chamar essa edge function em vez de simular.

### Step 3: Edge function `ai-flow-generator`
Funcao que usa Lovable AI Gateway para gerar estrutura JSON de fluxo a partir de prompt do usuario. Atualizar `AIFlowModal.tsx` para chamar a edge function.

### Step 4: Edge function `meta-templates`
Funcao que submete templates para aprovacao na Meta via Cloud API. Atualizar aba Templates em `Fluxos.tsx` para ter botao funcional de submissao.

### Step 5: Exportacao CSV em Leads
Adicionar funcao `exportCSV()` na pagina Leads (mesmo padrao ja usado em Pedidos).

### Arquivos criados/editados

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/new.sql` | Indices, triggers, realtime |
| `supabase/functions/checkout-api/index.ts` | Edge function delivery + pagamento |
| `supabase/functions/ai-flow-generator/index.ts` | Edge function IA |
| `supabase/functions/meta-templates/index.ts` | Edge function submissao Meta |
| `src/pages/CheckoutPublic.tsx` | Integrar checkout-api |
| `src/components/fluxos/AIFlowModal.tsx` | Integrar ai-flow-generator |
| `src/pages/Fluxos.tsx` | Botao submissao template |
| `src/pages/Leads.tsx` | Adicionar exportacao CSV |

### Dependencias externas necessarias

- **Logzz/Coinzz tokens**: ja armazenados na tabela `integrations` pelo usuario
- **MercadoPago access token**: ja armazenado na tabela `integrations` pelo usuario
- **Meta access token + WABA ID**: ja armazenados na tabela `whatsapp_instances`
- **LOVABLE_API_KEY**: ja configurado automaticamente (verificado nos secrets)


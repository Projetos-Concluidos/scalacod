

## Plano: Corrigir sistema de envio/recebimento WhatsApp via Evolution API

### Diagnostico

Apos analise completa do codigo, identifiquei **3 problemas criticos** que impedem o funcionamento do Inbox WhatsApp com a Evolution API:

#### Bug 1: Webhook quebrado — variavel `url` nao existe
Em `whatsapp-webhook/index.ts` linha 66-67, o codigo usa `url.searchParams` mas a variavel `url` nunca e declarada. Isso causa crash em **toda** requisicao de webhook, impedindo o recebimento de mensagens.

#### Bug 2: Parametro do webhook incompativel
O `evolution-instance` registra o webhook com `?user_id=XXX&provider=evolution`, mas o `whatsapp-webhook` espera `?store=XXX&provider=XXX`. O parametro `user_id` e ignorado — mesmo que o Bug 1 fosse corrigido, o `storeId` seria `null` e retornaria 400.

#### Bug 3: Phone number vazio na instancia
O campo `phone_number` da instancia esta vazio. O `send-whatsapp-message` nao adiciona prefixo `55` ao telefone brasileiro automaticamente. Numeros como `94992118777` sao enviados sem o codigo de pais.

### O que ja funciona
- Tabelas `conversations` e `messages` — estrutura correta
- `send-whatsapp-message` — logica de envio Evolution funcional (quando tem credenciais e phone correto)
- `execute-flow` — disparo de fluxos e envio via WhatsApp
- Frontend `Conversas.tsx` — Inbox completo com chat, filtros, labels, realtime, emojis, templates, teste
- `evolution-instance` — criacao e gerenciamento de instancias

### Plano de Implementacao

**1. Corrigir `whatsapp-webhook/index.ts`** (critico)
- Declarar `const url = new URL(req.url)` antes de usar `url.searchParams`
- Aceitar tanto `store` quanto `user_id` como parametro: `const storeId = url.searchParams.get("store") || url.searchParams.get("user_id")`
- Isso corrige recebimento de mensagens inbound e atualizacoes de status de conexao

**2. Corrigir formatacao de telefone em `send-whatsapp-message/index.ts`**
- Adicionar funcao `formatBrazilPhone(phone)` que garante prefixo `55` em numeros brasileiros
- Aplicar antes de montar o JID `@s.whatsapp.net` no bloco Evolution
- Aplicar no `cleanPhone` geral para todos os providers

**3. Atualizar `evolution-instance/index.ts`** — salvar phone_number
- No action `status` quando `state === "open"`, o codigo ja busca o `owner` mas o campo pode vir vazio
- Adicionar fallback: buscar phone do `fetchInstances` response no campo `instance.profilePictureUrl` ou `number`

**4. Corrigir `send-whatsapp-message` — fallback de credenciais Evolution**
- Quando `instance.evolution_server_url` ou `instance.api_key` estiverem vazios, buscar credenciais globais da `system_config` (mesmo padrao do `evolution-instance`)
- Isso garante que o envio funciona mesmo quando as credenciais nao foram salvas corretamente na instancia

### Detalhes tecnicos

```text
Fluxo corrigido de recebimento (inbound):
  Evolution API → POST webhook?user_id=XXX&provider=evolution
  → whatsapp-webhook: url = new URL(req.url)
  → storeId = url.get("store") || url.get("user_id")  
  → findOrCreateConversation(supabase, storeId, phone, null)
  → INSERT messages + UPDATE conversations
  → Realtime → Inbox atualiza

Fluxo corrigido de envio (outbound):
  Inbox/Flow → send-whatsapp-message
  → cleanPhone = formatBrazilPhone(phone)  // garante 55 prefix
  → Evolution: number = cleanPhone + "@s.whatsapp.net"
  → POST /message/sendText/{instanceName}
  → INSERT messages + UPDATE conversations
```

### Arquivos modificados
1. `supabase/functions/whatsapp-webhook/index.ts` — fix `url`, aceitar `user_id` param
2. `supabase/functions/send-whatsapp-message/index.ts` — formatBrazilPhone, fallback credenciais
3. `supabase/functions/evolution-instance/index.ts` — salvar phone_number corretamente

### Resultado esperado
- Mensagens recebidas no WhatsApp aparecem no Inbox em tempo real
- Envio de mensagens do Inbox funciona com numero BR formatado corretamente
- Fluxos automaticos (status de pedido) enviam mensagens com telefone correto
- Atualizacoes de conexao da Evolution refletem no banco


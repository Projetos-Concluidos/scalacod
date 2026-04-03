
Objetivo: estudar o retorno da Evolution (`Checking 1 numbers via Baileys`) e transformar isso em uma correção definitiva para os disparos que hoje falham com `exists: false`.

Diagnóstico do estudo
- O log da Evolution indica que ela está validando o número via Baileys antes do envio. Isso bate exatamente com o erro que já aparece nos logs do projeto: `exists:false`.
- Pela documentação da Evolution v2, o fluxo usado no projeto está correto nos endpoints principais:
  - `GET /instance/connectionState/{instance}`
  - `GET /instance/fetchInstances`
  - `POST /message/sendText/{instance}`
- O problema não parece ser Vercel nem formatação do payload principal. O número está sendo enviado no padrão que a própria integração usa hoje: `55...@s.whatsapp.net`.
- O ponto crítico é este: o sistema hoje considera “instância conectada” quando `connectionState = open`, mas isso não garante, sozinho, que a checagem de existência via Baileys esteja saudável. Na prática, a sessão pode parecer aberta e mesmo assim retornar `exists:false` para números válidos.
- O Postman público referenciado não ficou acessível pelo link encontrado, então a base confiável do estudo foi a documentação oficial da Evolution v2 e os logs reais do projeto.

O que precisa ser implementado
1. Fortalecer o diagnóstico da instância Evolution
- Expandir a função `evolution-instance` para retornar mais dados do que apenas `connected: true/false`.
- Incluir no status:
  - `state`
  - dados vindos de `fetchInstances`
  - owner/profileName/status real da instância
  - resultado de uma checagem operacional da sessão
- Assim a UI deixa de mostrar apenas “conectado” e passa a mostrar se a sessão está realmente apta a enviar.

2. Criar um teste real de saúde da sessão
- Adicionar uma ação de diagnóstico para a Evolution que faça uma verificação controlada antes do envio em massa.
- A ideia é diferenciar:
  - instância aberta e saudável
  - instância aberta mas incapaz de validar/enviar
  - instância desconectada
- Isso evita falso positivo de “conectado”.

3. Melhorar o tratamento do erro `exists:false`
- Hoje ele vira apenas “Número não encontrado no WhatsApp”.
- A correção deve separar:
  - número realmente inexistente
  - sessão Evolution/Baileys instável
  - instância aberta porém inconsistente
- Quando muitos números válidos falharem em sequência com `exists:false`, tratar como falha da sessão/provedor, não como problema individual de contato.

4. Proteger a fila contra falso negativo da Evolution
- Se houver padrão de falha em lote com `exists:false`, pausar/reduzir tentativas automáticas em vez de marcar tudo como número inválido.
- Registrar motivo técnico mais claro no log da fila, para você saber se o erro foi:
  - contato inválido
  - sessão expirada
  - checagem Baileys inconsistente

5. Expor isso na interface
- Na aba `EvolutionTab`, mostrar diagnóstico mais completo:
  - estado da instância
  - número conectado
  - último status real da sessão
  - alerta quando a instância estiver “open” mas falhando na checagem/envio
- Trocar a sensação de “está conectado” por um status operacional confiável.

Arquivos principais envolvidos
- `supabase/functions/evolution-instance/index.ts`
- `supabase/functions/send-whatsapp-message/index.ts`
- `supabase/functions/process-message-queue/index.ts`
- `src/components/whatsapp/EvolutionTab.tsx`

Resultado esperado
- Identificar com clareza se o problema está no número ou na sessão Evolution/Baileys
- Evitar que números válidos sejam tratados como inexistentes quando o provedor estiver instável
- Mostrar na tela um diagnóstico real da conexão
- Tornar a fila mais resiliente e menos sujeita a travar ou falhar em massa por falso `exists:false`

Detalhes técnicos
```text
Situação atual
UI: "connected"  -> baseada em /instance/connectionState
Envio: /message/sendText/{instance}
Resposta de erro: exists:false

Risco atual
connectionState=open != sessão realmente saudável para validar números

Correção proposta
connectionState
 + fetchInstances
 + diagnóstico operacional
 + heurística de falha em lote
 = status confiável da instância
```

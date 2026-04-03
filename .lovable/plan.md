

## Plano: Correcao definitiva dos disparos WhatsApp

### Diagnostico (baseado nos logs reais)

**1. Causa do "Bad Request" — nao tem relacao com Vercel**

As Edge Functions rodam no Lovable Cloud, nao na Vercel. A Vercel so hospeda o frontend (HTML/JS). O erro vem da Evolution API que faz verificacao de existencia do numero no WhatsApp antes de enviar:

```text
Evolution response: {"status":400,"error":"Bad Request","response":{"message":[
  {"jid":"5567935057948@s.whatsapp.net","exists":false}
]}}
```

`exists: false` = o numero nao esta registrado no WhatsApp segundo a Evolution. Isso pode ser:
- Numero genuinamente sem WhatsApp (linha fixa, chip desativado)
- Falso negativo da API (instancia instavel)

O codigo atual trata isso como erro generico "Bad Request" e fica re-tentando inutilmente.

**2. Bug "R$ R$" — ainda presente**

Os templates no banco usam `R$ {{valor_total}}`, mas a variavel `valor_total` ja inclui "R$" (via `formatCurrency`). Resultado: `R$ R$ 175,33`.

### Correcoes

#### 1. Tratar `exists: false` como erro definitivo (`send-whatsapp-message`)

Quando Evolution retorna `exists: false`, extrair essa informacao e retornar erro especifico:
```typescript
if (!res.ok) {
  const responseMsg = data.response?.message;
  if (Array.isArray(responseMsg) && responseMsg.some(m => m.exists === false)) {
    sendError = "Número não encontrado no WhatsApp";
  } else {
    sendError = data.message || data.error || JSON.stringify(data);
  }
}
```

#### 2. Nao re-tentar erros de numero inexistente (`process-message-queue`)

Quando o erro contem "não encontrado no WhatsApp", marcar como `failed` imediatamente sem retry:
```typescript
if (e.message.includes("não encontrado no WhatsApp")) {
  await supabase.from("message_queue").update({
    status: "failed",
    error_message: e.message,
  }).eq("id", msg.id);
  failed++;
  continue; // skip retry logic
}
```

#### 3. Corrigir "R$ R$" — remover prefixo do `valor_total` (`execute-flow`)

Mudar `valor_total` para usar apenas o numero formatado (sem "R$"), ja que TODOS os templates no banco ja incluem `R$` manualmente:
```typescript
valor_total: valorFormatado, // "175,33" em vez de "R$ 175,33"
```

#### 4. Corrigir templates existentes no banco (Migration)

Atualizar os nodes dos fluxos existentes para trocar `R$ {{valor_total}}` por `{{valor_total}}` E alterar `valor_total` para incluir "R$" — OU manter templates como estao e so corrigir o ctx. 

A abordagem mais segura: manter os templates como `R$ {{valor_total}}` e fazer `valor_total` = numero sem "R$" (correcao no ponto 3 acima).

#### 5. Resetar mensagens pendentes com "Bad Request"

Migration para marcar mensagens pendentes atuais com erro "Bad Request" como falhadas com mensagem clara, desbloqueando a fila.

### Arquivos a editar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/send-whatsapp-message/index.ts` | Detectar `exists:false` e retornar erro especifico |
| `supabase/functions/process-message-queue/index.ts` | Nao re-tentar erros de numero inexistente |
| `supabase/functions/execute-flow/index.ts` | `valor_total` sem prefixo "R$" |
| Migration SQL | Marcar mensagens pendentes com "Bad Request" como failed |

### Resultado esperado
- Numeros sem WhatsApp sao identificados e marcados como "Número não encontrado no WhatsApp" sem retries
- Templates exibem "R$ 175,33" corretamente (sem duplicacao)
- Fila desbloqueada imediatamente
- Frontend na Vercel nao e afetado (problema e 100% backend)


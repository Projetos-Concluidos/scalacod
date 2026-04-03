

## Plano: Filtro de numeros invalidos + melhorar tratamento de "Bad Request" + destravar fila

### Diagnostico

Analisei os dados reais no banco e os logs:

1. **Numero `99999999999`** — numero falso (teste). A Evolution API recebe `5599999999999@s.whatsapp.net` e retorna "Bad Request" porque nao e um numero WhatsApp valido. A fila fica tentando enviar ate esgotar retries.

2. **Walterlange (86988158793)** — numero real, porem tambem recebeu "Bad Request". O telefone e formatado como `5586988158793` (correto). Pode ser que a Evolution API retornou erro detalhado mas o codigo so captura `data.message || data.error` sem logar o body completo.

3. **Bug "R$ R$"** — os templates exibem `R$ R$ 175,33` (duplicado). O valor ja vem formatado com "R$" e o template adiciona outro.

4. **Erro generico** — quando a Evolution retorna erro, o codigo nao loga o body da resposta, dificultando debug.

### Correcoes

#### 1. Filtro de numeros invalidos (`process-message-queue`)

Antes de tentar enviar, validar o telefone:
```typescript
const INVALID_PATTERNS = [
  /^(\d)\1{9,}$/,           // todos digitos iguais (99999999999, 11111111111)
  /^(0{10,})$/,             // zeros
  /^(12345678|87654321)/,   // sequenciais
];

function isInvalidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  if (clean.length < 10 || clean.length > 13) return true;
  const local = clean.startsWith("55") ? clean.slice(2) : clean;
  return INVALID_PATTERNS.some(p => p.test(local));
}
```

Se invalido: marcar como `failed` com `error_message: "Numero invalido/ficticio"` e pular para o proximo.

#### 2. Log detalhado do erro Evolution (`send-whatsapp-message`)

Quando a Evolution retorna erro, logar o body completo:
```typescript
const data = await res.json();
if (res.ok) {
  messageIdWhatsapp = data.key?.id || data.id || null;
} else {
  console.error("[send-whatsapp-message] Evolution error body:", JSON.stringify(data));
  sendError = data.message || data.error || JSON.stringify(data) || `Evolution error: ${res.status}`;
}
```

#### 3. Corrigir "R$ R$" duplicado (`execute-flow`)

Na montagem do `ctx`, o campo `valor` ja contem "R$". Os templates usam `R$ {{valor}}`. Corrigir para que o valor no ctx seja apenas o numero formatado sem "R$".

#### 4. Re-disparar mensagem da Walterlange

Resetar o retry e process_after da mensagem `69c4920b` para que seja processada no proximo ciclo do cron (apos o fix de log ser deployado para capturar o erro real).

#### 5. Limpar mensagens de numeros invalidos

Marcar como `failed` todas as mensagens pendentes com telefone `99999999999` e similares.

### Arquivos a editar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/process-message-queue/index.ts` | Adicionar filtro de telefone invalido antes do envio |
| `supabase/functions/send-whatsapp-message/index.ts` | Melhorar log de erro da Evolution API |
| `supabase/functions/execute-flow/index.ts` | Corrigir valor duplicado "R$ R$" |
| Migration SQL | Resetar msg da Walterlange + falhar msgs de numeros invalidos |

### Resultado esperado
- Numeros fictícios (99999999999, 11111111111, etc.) sao detectados e ignorados instantaneamente
- Fila avanca sem ficar travada em numeros invalidos
- Erros da Evolution API sao logados com detalhes para debug
- Mensagem da Walterlange sera re-disparada
- Templates exibem "R$ 107,00" em vez de "R$ R$ 107,00"


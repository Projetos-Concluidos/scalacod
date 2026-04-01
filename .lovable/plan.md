

## Plano: Corrigir Envio de Pedidos para Logzz

### Diagnóstico

Analisei os logs e o código do outro projeto. O problema tem **duas causas**:

1. **User-Agent ausente no `send_to_logzz`**: A action `send_to_logzz` (linha 1095-1099) NÃO inclui o header `User-Agent`. O `create_order` (linha 267) tem, mas o `send_to_logzz` não. Sem User-Agent de navegador, Cloudflare bloqueia com 403 imediatamente.

2. **Possível hash do webhook expirado**: O outro projeto confirma que o hash do webhook (`ori1xzrv` no seu caso) pode expirar na plataforma Logzz. Se o hash mudou, todas as requisições retornam 403 independente dos headers.

### O que o outro projeto ensina

- Runtime é idêntico (Supabase Edge Functions / Deno) — não é problema de plataforma
- Headers obrigatórios: `User-Agent: Mozilla/5.0...` + `Authorization: bearer {token}`
- Se continuar 403 mesmo com headers corretos = hash expirado, verificar no painel Logzz
- A API `/api/v1/orders` nunca foi usada no outro projeto — o webhook de importação é o caminho correto

### Alterações

#### 1. `supabase/functions/checkout-api/index.ts` — Corrigir headers do `send_to_logzz`

Adicionar `User-Agent` ao objeto `logzzHeaders` na action `send_to_logzz` (linha ~1098):

```typescript
const logzzHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};
if (bearerToken) logzzHeaders["Authorization"] = `bearer ${bearerToken}`;
```

Mudanças específicas:
- Adicionar `User-Agent` (estava faltando)
- Mudar `Bearer` para `bearer` (lowercase, como o outro projeto usa)
- Remover a lógica de "warmup" com cookies — o outro projeto não faz isso e funciona
- Remover o fallback para `/api/v1/orders` — o outro projeto confirma que nunca foi usado
- Simplificar: POST direto para o webhook com os headers corretos

Aplicar a mesma mudança no `create_order` (linha 269): `bearer` lowercase.

#### 2. Deploy + Teste Real

- Redeploiar a edge function
- Enviar pedido #C6Y7DN3Z para Logzz via `send_to_logzz`
- Se ainda der 403: o hash `ori1xzrv` expirou e o usuário precisa verificar no painel Logzz

#### 3. Ação do usuário (se necessário)

Se após a correção dos headers o 403 persistir:
- Acessar app.logzz.com.br → Remapeamento → URL de webhook
- Verificar se o hash atual é `ori1xzrv` ou se mudou
- Se mudou, atualizar em Configurações → Integrações → Logzz → URL de Importação

### Escopo
- 1 arquivo: `checkout-api/index.ts`
- Simplificação do código (remover warmup + fallback desnecessários)
- Deploy e teste real imediato


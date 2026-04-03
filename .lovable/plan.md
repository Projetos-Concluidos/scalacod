

## Plano: Adaptar projeto para deploy na Vercel

### Problema
O erro 404 no screenshot ocorre porque a Vercel nao sabe redirecionar rotas do SPA (como `/c/1-un-organic-lizz-por-107-salq2l6x`) para o `index.html`. Sem configuracao, a Vercel tenta encontrar um arquivo real nesse caminho e retorna 404.

### Correcao

**Criar arquivo `vercel.json` na raiz do projeto:**

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Isso instrui a Vercel a servir `index.html` para todas as rotas que nao correspondem a arquivos estaticos, permitindo que o React Router (BrowserRouter) gerencie a navegacao no cliente.

### Notas importantes

- O projeto ja usa `BrowserRouter` corretamente
- As Edge Functions do backend continuam rodando no Lovable Cloud (nao na Vercel) — nenhuma mudanca necessaria no backend
- As variaveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` precisam ser configuradas nas Environment Variables da Vercel para que o frontend se conecte ao backend

### Resultado esperado
- Checkout publico (`/c/...`) e todas as outras rotas do SPA funcionam sem 404
- Build da Vercel continua usando `vite build` normalmente


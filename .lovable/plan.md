

## Plano: Criar pagina /accept-invite para aceitar convites de equipe

### Problema
A rota `/accept-invite` nao existe no React Router. O `EquipeTab` gera links com esse caminho, mas nenhuma pagina foi criada para processar o token e chamar a edge function `team-invite`.

### Correcao

**1. Criar `src/pages/AcceptInvite.tsx`**
- Pagina publica (fora do AuthGuard)
- Le o `token` da query string
- Se usuario nao esta logado: redireciona para `/login?redirect=/accept-invite?token=xxx`
- Se usuario esta logado: chama `supabase.functions.invoke("team-invite", { body: { token } })`
- Exibe estados: carregando, sucesso (com papel atribuido), erro (token invalido/expirado/ja usado)
- Botao para ir ao Dashboard apos sucesso

**2. Atualizar `src/App.tsx`**
- Adicionar rota publica: `<Route path="/accept-invite" element={<AcceptInvite />} />`
- Importar com `lazyWithRetry`

**3. Atualizar `src/pages/Login.tsx`**
- Verificar se ja suporta `redirect` query param para redirecionar apos login
- Se nao, adicionar suporte para que o membro seja redirecionado ao `/accept-invite` apos logar

### Arquivos envolvidos
| Arquivo | Mudanca |
|---|---|
| `src/pages/AcceptInvite.tsx` | Novo — pagina de aceite de convite |
| `src/App.tsx` | Adicionar rota `/accept-invite` |
| `src/pages/Login.tsx` | Garantir suporte a redirect param |

### Resultado
- Membro clica no link → ve pagina de aceite → loga se necessario → convite aceito automaticamente
- Sem mais 404


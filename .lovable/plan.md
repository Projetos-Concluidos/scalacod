

## Relatorio: Causa do erro intermitente "Algo deu errado"

### Diagnostico

O erro e capturado pelo `ErrorBoundary` no `main.tsx`, que envolve toda a aplicacao. Quando qualquer componente React lanca uma excecao durante a renderizacao, o ErrorBoundary captura e mostra a tela de erro. O problema: **em producao, o erro real e silenciado** (`componentDidCatch` so loga em DEV).

**Causas identificadas:**

1. **Falha de chunk lazy-load (causa principal)** — Todas as paginas usam `lazyWithRetry`. Quando o Vite faz um novo deploy, os hashes dos chunks mudam. Se o usuario tem a aba aberta e navega para uma rota nova, o chunk antigo nao existe mais no servidor. O `lazyWithRetry` tenta um reload, mas se o reload tambem falhar (ex: cache do service worker, rede lenta), a excecao sobe ate o ErrorBoundary.

2. **Race condition no AuthContext** — `fetchProfile` nao tem try/catch. Se o Supabase retornar erro (rede instavel, token expirado entre chamadas), o `setProfile` nunca e chamado, e componentes que acessam `profile` podem receber `null` em momentos inesperados. O `useHomeSettings` tambem lanca (`throw error`) dentro do queryFn.

3. **QueryClient sem configuracao de retry/error** — O `QueryClient` esta instanciado sem nenhuma opcao. O default do React Query e 3 retries com exponential backoff, mas se todos falharem e algum componente fizer `throw` no render baseado em dados ausentes, o ErrorBoundary captura.

4. **ErrorBoundary nao e recuperavel** — Uma vez que o ErrorBoundary entra em estado de erro, so um reload completo resolve. Nao ha mecanismo de "tentar novamente" sem recarregar a pagina inteira.

### Plano de correcao

**1. ErrorBoundary com logging em producao e auto-recovery**
- Logar o erro em producao (nao so em DEV)
- Adicionar botao "Tentar novamente" que reseta o estado do ErrorBoundary sem reload
- Mostrar mensagem do erro em modo colapsavel para debug

**2. Proteger `fetchProfile` no AuthContext**
- Envolver `fetchProfile` em try/catch para que erros de rede nao explodam silenciosamente
- Garantir que `setLoading(false)` sempre e chamado mesmo em erro

**3. Configurar QueryClient com defaults resilientes**
- Adicionar `retry: 2`, `staleTime`, e `refetchOnWindowFocus: false`
- Evitar que erros de query subam como excecoes de render

**4. Melhorar `lazyWithRetry` para chunk failures**
- Adicionar delay antes do retry para dar tempo do novo deploy propagar
- Logar o erro para diagnostico

### Arquivos envolvidos

| Arquivo | Mudanca |
|---|---|
| `src/components/ErrorBoundary.tsx` | Logging em producao, botao de recovery sem reload, exibir erro |
| `src/contexts/AuthContext.tsx` | try/catch no `fetchProfile` |
| `src/App.tsx` | Configurar `QueryClient` com defaults resilientes |
| `src/lib/lazyWithRetry.ts` | Delay antes do retry, logging |

### Resultado esperado
- Erros intermitentes nao travam mais a aplicacao inteira
- Usuario pode clicar "Tentar novamente" sem recarregar
- Erros de rede/chunk sao tratados graciosamente
- Logs em producao permitem diagnosticar a causa real quando o erro ocorrer


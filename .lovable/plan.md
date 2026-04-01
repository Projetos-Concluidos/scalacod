

# Fix: Persistir Credenciais de Integrações Globais + Status e Teste de API

## Problema
As credenciais digitadas no painel de integrações globais do admin são armazenadas apenas em estado local (`useState`). Ao recarregar a página, tudo se perde. Além disso, não há indicação de status (ativa/inativa) nem botão para testar as APIs.

## Solução

### 1. Persistir no banco de dados (`system_config`)
- Usar a tabela `system_config` (já existente, com RLS superadmin) para salvar cada campo como uma chave separada (ex: `integration_evolution_url`, `integration_evolution_api_key`)
- No `useEffect` inicial, carregar todas as chaves `integration_%` da `system_config` e popular o estado
- No `handleSave`, fazer upsert na `system_config` para cada campo da seção

### 2. Indicador de Status (Ativa/Inativa)
- Cada seção mostrará um badge verde "Ativa" ou vermelho "Inativa"
- Lógica: se todos os campos obrigatórios de uma seção estão preenchidos no banco → "Ativa", caso contrário → "Inativa"

### 3. Botão "Testar API"
- Cada seção terá um botão "Testar Conexão" ao lado do "Salvar"
- Para **Evolution API**: `GET {url}/instance/fetchInstances` com header `apikey`
- Para **MercadoPago**: `GET https://api.mercadopago.com/v1/payment_methods` com `Authorization: Bearer {token}`
- Para **ElevenLabs**: `GET https://api.elevenlabs.io/v1/user` com header `xi-api-key`
- Para **OpenAI**: `GET https://api.openai.com/v1/models` com `Authorization: Bearer {key}`
- Uma edge function `test-integration` receberá `{ provider, credentials }` e fará a chamada server-side, retornando `{ success, message }`

### 4. Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `src/pages/admin/AdminIntegracoes.tsx` | Reescrever: carregar do DB, salvar no DB, badges de status, botão testar |
| `supabase/functions/test-integration/index.ts` | **Criar**: edge function para testar cada provedor |

### Detalhes técnicos

**Carregamento (useEffect)**:
```
SELECT key, value FROM system_config WHERE key LIKE 'integration_%'
```

**Salvamento (upsert)**:
```
supabase.from('system_config').upsert({ key, value, description, updated_at })
```

**Edge function `test-integration`**:
- Recebe `{ provider: 'evolution' | 'mercadopago' | 'elevenlabs' | 'openai', credentials: Record<string,string> }`
- Valida que é superadmin via JWT
- Faz fetch para o endpoint de teste do provedor
- Retorna `{ success: boolean, message: string }`

**Valores armazenados como JSONB strings** na coluna `value` (ex: `'"sk-abc123"'`), consistente com o padrão já existente na tabela.


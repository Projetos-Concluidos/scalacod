

## Plano: Corrigir Teste de Conexão ElevenLabs e OpenAI

### Problema

O erro `"The API key you used is missing the permission user_read"` vem da ElevenLabs. O endpoint de teste atual (`/v1/user`) exige a permissão `user_read` na API Key, que nem todas as chaves possuem por padrão.

Para OpenAI, o endpoint `/v1/models` pode também falhar com chaves restritas.

### Solução

Alterar os endpoints de teste na edge function `test-integration` para usar endpoints que exigem permissões mais básicas:

**ElevenLabs**: Trocar `/v1/user` por `/v1/voices` (requer apenas `voices_read`, permissão padrão em qualquer chave).

**OpenAI**: Trocar `/v1/models?limit=1` por `/v1/models/tts-1` (verifica se a chave é válida e tem acesso ao modelo TTS usado no sistema).

### Escopo
- **1 edge function editada**: `supabase/functions/test-integration/index.ts` (linhas 104-139)




## Plano: Fallback ElevenLabs → OpenAI TTS

### Contexto

Atualmente, a edge function `generate-audio` usa **apenas** ElevenLabs. As chaves de integração ficam salvas na tabela `system_config` (ex: `integration_elevenlabs_api_key`, `integration_openai_api_key`). Quando o admin desativa ElevenLabs (removendo a chave), o sistema quebra.

### Lógica de Fallback

A edge function `generate-audio` passa a verificar na `system_config` qual provedor está ativo:

1. Busca `integration_elevenlabs_api_key` e `integration_openai_api_key` da `system_config`
2. Se ElevenLabs tiver chave configurada → usa ElevenLabs (comportamento atual)
3. Se ElevenLabs **não** tiver chave mas OpenAI tiver → usa OpenAI TTS (`POST https://api.openai.com/v1/audio/speech`)
4. Se nenhum tiver chave → retorna erro claro

### OpenAI TTS

A API OpenAI TTS é simples:
- Endpoint: `POST https://api.openai.com/v1/audio/speech`
- Body: `{ model: "tts-1", voice: "nova", input: text }`
- Retorna audio binário (MP3)
- Vozes disponíveis: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

Como OpenAI não usa `voiceId` do ElevenLabs, a function fará um mapeamento: se o `voiceId` enviado for um ID ElevenLabs, mapeia para uma voz OpenAI padrão (ex: `nova` para feminino, `onyx` para masculino), ou aceita diretamente nomes de voz OpenAI.

### Alterações na Biblioteca (Frontend)

A página `Vozes.tsx` precisa adaptar a aba "Biblioteca":
- Se ElevenLabs está ativo → mostra biblioteca ElevenLabs (comportamento atual)
- Se apenas OpenAI está ativo → mostra as 6 vozes OpenAI como opções na biblioteca (alloy, echo, fable, onyx, nova, shimmer)
- O frontend busca o status do provedor via `system_config`

### Alterações

#### 1. Edge Function `generate-audio/index.ts`

- Remove dependência do secret `ELEVENLABS_API_KEY` (que é fixo)
- Busca chaves dinâmicas da `system_config` via Supabase client
- Implementa dois caminhos: ElevenLabs ou OpenAI TTS
- OpenAI: `POST /v1/audio/speech` com model `tts-1-hd`, voz mapeada
- Mesmo fluxo de upload para Storage e débito de tokens

#### 2. Edge Function `list-voice-library/index.ts`

- Verifica qual provedor está ativo na `system_config`
- Se ElevenLabs → busca vozes da API ElevenLabs (atual)
- Se OpenAI → retorna lista fixa das 6 vozes OpenAI com metadados (nome, idioma, gênero, caso de uso)

#### 3. `src/pages/Vozes.tsx`

- Ao carregar, busca `system_config` para saber o provedor ativo
- Exibe badge "ElevenLabs" ou "OpenAI" no header
- Adapta o fallback de biblioteca para vozes OpenAI quando necessário
- O campo `elevenlabs_voice_id` na tabela `voices` passa a aceitar também IDs OpenAI (são strings simples como "nova", "alloy")

#### 4. Edge Function `clone-voice/index.ts`

- Clonagem de voz só funciona com ElevenLabs
- Se ElevenLabs não estiver ativo, retorna erro: "Clonagem de voz requer ElevenLabs ativo"

### Escopo
- 3 edge functions editadas: `generate-audio`, `list-voice-library`, `clone-voice`
- 1 arquivo frontend: `src/pages/Vozes.tsx`
- Sem migrações (reutiliza campo `elevenlabs_voice_id` para IDs OpenAI)
- Sem novos secrets (chave OpenAI já fica na `system_config`)


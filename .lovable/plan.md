

## Plano: Melhorias Funcionais na Página de Vozes (ElevenLabs API)

Baseado na análise dos prints do concorrente, identifiquei 6 diferenças funcionais a implementar:

---

### 1. Separar "Minhas Vozes" em 2 seções

**Atual**: Grid flat misturando clonadas e favoritadas.
**Melhoria**: Dividir em **"Vozes Clonadas"** (esquerda, com contador) e **"Vozes Escolhidas"** (direita, com link "Ver Biblioteca").

- Slot "Novo slot de clonagem" sempre visível na seção de clonadas
- Vozes escolhidas com botão "Desfavoritar" que remove da tabela `voices`

### 2. Busca + filtro de categoria na Biblioteca

**Atual**: Só filtros de idioma e gênero.
**Melhoria**: Adicionar campo de busca por nome e filtro de categoria/use_case (Todas, Narração, Conversacional, etc.). Busca local nos dados já carregados.

### 3. Descrição nos cards da Biblioteca

**Atual**: Cards mostram só nome e tags básicas.
**Melhoria**: Exibir descrição da voz (campo `description` da API ElevenLabs). Requer pequena alteração na edge function `list-voice-library` para incluir `v.description`.

### 4. Modal de clonagem melhorado

- Adicionar campo **"Descrição (opcional)"**
- Aceitar **.m4a** além de .mp3/.wav
- Texto "Máx 25 amostras" (limite real da API ElevenLabs)
- Enviar `description` na edge function `clone-voice`

### 5. Botão Desfavoritar na Biblioteca

Vozes já favoritadas mostram botão **"Favoritada"** (estilo diferente) que permite desfavoritar com um clique (deleta da tabela `voices`).

### 6. Edge functions atualizadas

- **`list-voice-library`**: Adicionar `description: v.description || ""` ao mapeamento
- **`clone-voice`**: Aceitar campo `description` no FormData e enviá-lo à API ElevenLabs

---

### Escopo
- **2 edge functions editadas**: `list-voice-library`, `clone-voice`
- **1 arquivo frontend editado**: `src/pages/Vozes.tsx`
- Sem migrações


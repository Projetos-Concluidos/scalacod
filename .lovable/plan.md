## Plano: Melhorias Funcionais na Página de Vozes (ElevenLabs API)

### Análise: O que o concorrente tem que falta

Baseado nos prints, identifiquei **6 diferenças funcionais** (não visuais):

---

### 1. Separar "Minhas Vozes" em 2 seções

**Atual**: Grid flat misturando clonadas e favoritadas.
**Melhoria**: Dividir em **"Vozes Clonadas"** (esquerda, com contador "0 vozes") e **"Vozes Escolhidas"** (direita, com link "Ver Biblioteca").

- Vozes clonadas: cards com badge "CLONADA", botão de deletar
- Vozes escolhidas: cards com badge "FAVORITA", botão "Desfavoritar" (remove dos favoritos)
- Slot "Novo slot de clonagem" sempre visível na seção de clonadas (abre modal de clone)

---

### 2. Busca + filtro de categoria na Biblioteca

**Atual**: Só filtros de idioma e gênero.
**Melhoria**: Adicionar:
- **Campo de busca** por nome da voz (text input com ícone de lupa)
- **Filtro de categoria/use_case** (Todas, Narração, Conversacional, Formal, etc.)
- Busca local nos dados já carregados (sem nova chamada à API)

---

### 3. Descrição nos cards da Biblioteca

**Atual**: Cards mostram só nome, idioma, gênero e use_case como tags.
**Melhoria**: Exibir o campo `labels.description` ou construir uma descrição a partir dos labels disponíveis da API ElevenLabs. A edge function `list-voice-library` já retorna `labels` — basta mapear `labels.description` e passar ao frontend.

Alteração na edge function `list-voice-library`: adicionar campo `description` ao mapeamento (já disponível em `v.description` da API ElevenLabs).

---

### 4. Modal de clonagem melhorado

**Atual**: 2 steps (nome → upload), aceita .mp3/.wav, limite "30 min".
**Melhoria**:
- Adicionar campo **"Descrição (opcional)"** no step 1
- Aceitar **.m4a** além de .mp3/.wav
- Mudar texto para "Máx 25 amostras" (limite real da API ElevenLabs)
- Enviar `description` junto ao FormData para a edge function `clone-voice`
- Atualizar `clone-voice` para incluir `description` no payload à API ElevenLabs

---

### 5. Botão Desfavoritar funcional

**Atual**: Coração na biblioteca apenas adiciona, sem opção de remover no "Minhas Vozes".
**Melhoria**:
- Na seção "Vozes Escolhidas", cada card terá botão **"Desfavoritar"** que remove a voz da tabela `voices`
- Na Biblioteca, vozes já favoritadas mostram botão **"Favoritada"** (com estilo diferente) que permite desfavoritar com um clique

---

### 6. Passar `description` da API ElevenLabs

**Edge function `list-voice-library`**: Adicionar `description: v.description || ""` ao mapeamento de vozes retornado.

**Interface `LibraryVoice`**: Adicionar campo `description: string`.

---

### Escopo
- **2 edge functions editadas**: `list-voice-library` (campo description), `clone-voice` (campo description)
- **1 arquivo frontend editado**: `src/pages/Vozes.tsx` (layout, busca, filtros, modal)
- Sem migrações

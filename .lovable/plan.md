

## Plano: Melhorias no Menu Conversas (Teste + Filtros Avançados)

Baseado nos prints do concorrente, identifiquei 2 funcionalidades ausentes:

---

### 1. Botão "Teste" + Modal "Enviar Teste"

**O que faz**: Botão com ícone de frasco (flask) no header das Conversas que abre um modal para enviar mensagem ou disparar fluxo para **qualquer número**, sem precisar ter uma conversa existente.

**Modal com 2 abas**:
- **Mensagem Avulsa**: Campo "Número (com DDD)" + campo "Mensagem" + botão "Enviar Mensagem"
- **Disparar Fluxo**: Campo "Número (com DDD)" + Select "Escolha um fluxo..." (lista flows do usuário com contagem de msgs) + botão "Disparar Fluxo"

O envio usa as edge functions já existentes (`send-whatsapp-message` e `trigger-flow`).

---

### 2. Filtros Avançados (estilo concorrente)

Substituir os filtros atuais (simples demais) por um painel completo com 4 grupos de filtros em chip toggle:

**Grupo 1 — Leitura**: `Todas` | `Não lidas` | `Lidas`
**Grupo 2 — Janela WhatsApp**: `Todos` | `Pode responder` | `Janela expirada`
**Grupo 3 — Tipo de conteúdo**: `Todos` | `Com mídia` | `Só texto`
**Grupo 4 — Período**: `Qualquer data` | `Hoje` | `7 dias` | `30 dias`

- Badge com contagem de filtros ativos no ícone de filtro
- Botão "Limpar todos" no topo do painel
- Remover o filtro antigo (status Abertas/Fechadas/Aguardando + checkbox não lidas)

A filtragem de "Janela expirada" verifica se `last_message_at` tem mais de 24h (regra da Meta). "Com mídia" filtra conversas cujo `last_message` contém marcadores de mídia.

---

### Detalhes Técnicos

**Arquivo editado**: `src/pages/Conversas.tsx`

- Novos estados: `testModalOpen`, `testMode` ("message" | "flow"), `testPhone`, `testMessage`, `testFlowId`, `readFilter`, `windowFilter`, `mediaFilter`, `dateFilter`
- Import `Flask` de lucide-react para o ícone do botão Teste
- O modal usa `Dialog` existente com toggle entre as 2 abas
- A lógica de filtro no `useMemo` `filtered` será expandida para aplicar todos os 4 grupos
- Para "Disparar Fluxo", reutiliza a edge function `trigger-flow` passando o número e flowId

**Sem migrações, sem edge functions novas.**

---

### Escopo
- **1 arquivo editado**: `src/pages/Conversas.tsx`
- Botão "Teste" + modal com 2 abas
- 4 grupos de filtros avançados com chips
- Badge de contagem no ícone de filtro


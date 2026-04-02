## Plano: Upgrade Completo do Sistema de Fluxos

Baseado na análise do concorrente (formato exportado decodificado + prints), o sistema deles tem funcionalidades avançadas que faltam no nosso. Este plano implementa as melhorias em 4 blocos.

---

### 1. Exportar/Importar Fluxos (Base64)

**O que faz**: O concorrente exporta fluxos como string Base64 (JSON codificado) para compartilhar entre contas. Ao importar, o usuário pode escolher manter o provider original ou converter para Evolution/Oficial.

**Implementação**:
- **Exportar**: No dropdown "Mais opções" de cada fluxo, botão "Exportar" que serializa `{ _ninjacod: true, v: 1, name, description, provider, nodes, edges }` → `btoa()` → copia para clipboard
- **Importar**: Modal com textarea para colar o código, 3 botões ("Manter original", "Evolution", "API Oficial"), valida o JSON, cria o fluxo na conta do usuário
- Arquivo: `src/pages/Fluxos.tsx` (modal de importação + handler de exportação)

---

### 2. Novos Tipos de Nó no Builder

O concorrente tem tipos que não temos:

| Tipo | Descrição |
|------|-----------|
| **trigger** | Nó de início com keyword/evento (substitui o "start" genérico) |
| **action** | Atualizar status do pedido (ex: CONFIRMED_BY_CUSTOMER) |
| **remarketing** | Sequência de follow-ups com delays (2h, 6h, 1 dia) |
| **template** | Mensagem tipo template oficial Meta |
| **video** | Mensagem de vídeo |
| **document** | Mensagem de documento |

**Implementação**:
- Expandir `NODE_TYPES_CONFIG` no `FlowBuilderModal.tsx` com os novos tipos
- Cada tipo terá configuração específica no painel lateral direito

---

### 3. Painel de Configuração Rico (Sidebar Direita)

O concorrente tem um painel lateral completo ao clicar num nó (prints image-64, image-65):

- **Rótulo** (nome editável do nó)
- **Tipo de mensagem** com grid de ícones: Texto, Imagem, Vídeo, Documento, Áudio, Botões, Lista, Template
- **Cabeçalho** (opcional) com emoji picker
- **Texto da mensagem** com variáveis clicáveis e botão "Gerar áudio"
- **Rodapé** (opcional)
- **Aguardar resposta do cliente**: Padrão (1 resposta), Smart (campos específicos), Nenhum
- **Continuar se não responder** (toggle com timeout)
- **Pré-visualização WhatsApp** em tempo real
- **Botão "Concluído"** para salvar configuração do nó

**Implementação**:
- Reescrever o painel direito do `FlowBuilderModal.tsx` (step 2) com todas essas seções
- Os dados editados atualizam o `node.data` em tempo real via `setNodes`
- A pré-visualização mostra bubble WhatsApp com header, body, footer, botões

---

### 4. Melhoria do Agente IA para Fluxos

O concorrente tem um modal IA mais completo (print image-59):
- Seletor de provedor WhatsApp (Oficial/Evolution)
- Dicas para melhores resultados
- Aceita colar fluxos de outras plataformas (ManyChat, Botpress) para adaptar

**Implementação**:
- Atualizar `AIFlowModal.tsx`: adicionar seletor de provedor, seção de dicas, suporte a importação de fluxos de outras plataformas no prompt
- Atualizar `ai-flow-generator` edge function: expandir o system prompt para gerar os novos tipos de nó (action, remarketing, buttons com connections, waitForResponse)
- A IA continuará usando Lovable AI (já configurado)

---

### Detalhes Técnicos

**Arquivos editados**:
1. `src/pages/Fluxos.tsx` — Export handler, Import modal, botão exportar no dropdown de cada fluxo
2. `src/components/fluxos/FlowBuilderModal.tsx` — Novos tipos de nó, painel de configuração rico, pré-visualização WhatsApp
3. `src/components/fluxos/AIFlowModal.tsx` — Seletor de provedor, dicas, suporte a importação
4. `supabase/functions/ai-flow-generator/index.ts` — System prompt expandido para novos tipos de nó

**Sem migrações** — a estrutura de `flows.nodes` (JSONB) já suporta qualquer formato de nó.

**Formato de exportação**:
```
Base64( JSON.stringify({
  _ninjacod: true,
  v: 1,
  name: "Pedido Feito",
  description: "...",
  provider: "official" | "evolution",
  nodes: [...],
  edges: [...]
}) )
```

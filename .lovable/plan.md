

# Plano: Edição de Templates de Fluxo + Conversas Arquivadas

## Resumo

Duas melhorias serão implementadas:

1. **Edição de mensagens dos fluxos existentes** — Permitir editar diretamente o conteúdo das mensagens de cada nó de um fluxo já criado, sem precisar reconstruir o fluxo do zero. O FlowBuilderModal já suporta edição de nós quando aberto com `initialData`, então o foco é garantir que ao clicar em "Editar" (ícone de lápis) no fluxo, o builder abra com todos os dados carregados e que os nós de mensagem sejam facilmente editáveis com o painel de configuração lateral.

2. **Conversas Arquivadas como aba separada** — Ao arquivar uma conversa, ela deve sumir da lista principal e aparecer apenas em uma aba dedicada "Arquivadas". Incluir opção de desarquivar.

---

## Parte 1: Edição de Templates/Mensagens dos Fluxos

### O que será feito

- Atualmente, clicar no lápis já abre o `FlowBuilderModal` com `initialData={flow}`. O builder carrega os nós e permite clicar em cada um para editar no painel lateral.
- **Melhoria**: Adicionar na listagem de fluxos um botão de "Editar Mensagens" que abre o builder diretamente no Step 2 (canvas) com o nó selecionado, facilitando a edição rápida.
- Garantir que o painel de configuração do nó permita editar todos os campos: conteúdo da mensagem, tipo de mídia, variáveis, delay, template name, header, footer, buttons.
- Adicionar preview visual do conteúdo da mensagem na listagem de nós dentro do builder.

### Arquivos modificados
- `src/pages/Fluxos.tsx` — Adicionar botão "Editar Mensagens" no dropdown de cada fluxo
- `src/components/fluxos/FlowBuilderModal.tsx` — Permitir abrir direto no step 2; melhorar UX do painel de edição de nós com preview de conteúdo

---

## Parte 2: Conversas Arquivadas

### O que será feito

- Adicionar tabs "Conversas" e "Arquivadas" no topo da lista de conversas
- Na tab principal "Conversas", filtrar automaticamente `status !== "archived"`
- Na tab "Arquivadas", mostrar apenas `status === "archived"`
- Ao arquivar, a conversa some da lista principal instantaneamente
- Na aba "Arquivadas", exibir botão "Desarquivar" que muda status de volta para "open"
- Manter os filtros avançados existentes funcionando em cada tab

### Arquivos modificados
- `src/pages/Conversas.tsx` — Adicionar state `conversationTab` ("active" | "archived"), tabs visuais, filtrar lista base por tab, botão desarquivar, e ao arquivar deselecionar a conversa e removê-la da lista ativa

---

## Detalhes técnicos

### Fluxos — FlowBuilderModal
- Novo prop opcional `initialStep?: number` para abrir direto no canvas (step 2)
- Melhorar `renderNodeConfigPanel` com textarea maior e preview de variáveis disponíveis
- No dropdown do fluxo em `Fluxos.tsx`, adicionar item "Editar Mensagens" que abre o builder com `initialStep={2}`

### Conversas — Tabs de Arquivamento
- State: `const [conversationTab, setConversationTab] = useState<"active" | "archived">("active")`
- No `filteredConversations` memo, adicionar filtro base: se tab é "active", excluir archived; se "archived", mostrar só archived
- Na função `updateConversationStatus("archived")`: após atualizar, deselecionar conversa (`setSelectedConv(null)`)
- Adicionar botão "Desarquivar" no header quando conversa arquivada está selecionada


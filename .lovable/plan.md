

## Plano de Implementação: Itens Faltantes e Melhorias do Relatório

Baseado na análise completa do projeto, organizei os itens em 4 lotes por prioridade de impacto.

---

### LOTE 1 — Correções Estruturais (Alta Prioridade)

**1. Exportar Pedidos para CSV**
- Botao no Kanban para baixar pedidos filtrados como .csv (nome, telefone, status, valor, data, produto, logzz_order_id)
- Arquivos: `Pedidos.tsx`

**2. Filtros avançados no Kanban**
- Filtrar por: data (range), produto, metodo de pagamento, logistics_type (Logzz/Coinzz)
- Painel colapsavel com chips de filtro ativo
- Arquivos: `Pedidos.tsx`

**3. Busca por nome/telefone em Conversas**
- Verificar se a busca existente realmente filtra; ajustar para buscar em `contact_name` e `contact_phone`
- Arquivos: `Conversas.tsx`

**4. Respostas Rapidas**
- Tabela `quick_replies` (user_id, shortcut, content)
- Botao no chat para selecionar resposta pre-salva
- CRUD inline para gerenciar respostas
- Arquivos: `Conversas.tsx`, migration SQL

---

### LOTE 2 — Automacoes e Fluxos (Media Prioridade)

**5. Estatisticas por fluxo individual**
- Dashboard dentro do card do fluxo: execucoes totais, sucesso, falha, taxa %
- Query em `flow_executions` agrupado por `flow_id`
- Arquivos: `Fluxos.tsx`

**6. Duplicar fluxo existente**
- Botao "Duplicar" no dropdown do fluxo, copia nodes/edges/trigger com nome "(Copia)"
- Arquivos: `Fluxos.tsx`

**7. Marcar conversa como Resolvida/Arquivada**
- Botoes de status ja existem parcialmente; garantir que o filtro lateral funcione e mostre contadores
- Arquivos: `Conversas.tsx`

---

### LOTE 3 — Suporte e Tutoriais (Media Prioridade)

**8. Tutoriais completos no Suporte**
- Adicionar secoes faltantes: Conversas, MercadoPago, Coinzz, Equipe, Notas Internas, Order Bump, Pixel/CAPI
- Cada secao com passo-a-passo detalhado, variaveis disponiveis, dicas
- Atualizar secoes existentes com novidades (auto-cancelamento 24h, templates COD/Coinzz, janela 24h)
- Arquivos: `Suporte.tsx`

---

### LOTE 4 — Polimentos e UX (Baixa Prioridade)

**9. Timeline visual de status do pedido**
- Ja existe aba Timeline no modal; melhorar com icones, cores por status e timestamps formatados
- Arquivos: `Pedidos.tsx`

**10. Notas internas em Conversas (melhorias)**
- Ja implementado com persistencia; adicionar indicador visual de quantidade de notas no card da conversa
- Arquivos: `Conversas.tsx`

**11. Dashboard: metricas de conversas**
- Card "Conversas abertas" e "Tempo medio de resposta" no Dashboard
- Arquivos: `Dashboard.tsx`

---

### Resumo Tecnico

| Item | Arquivos | DB Migration |
|---|---|---|
| Export CSV | Pedidos.tsx | Nao |
| Filtros avancados | Pedidos.tsx | Nao |
| Busca Conversas | Conversas.tsx | Nao |
| Respostas Rapidas | Conversas.tsx | Sim (quick_replies) |
| Stats por fluxo | Fluxos.tsx | Nao |
| Duplicar fluxo | Fluxos.tsx | Nao |
| Status conversa | Conversas.tsx | Nao |
| Tutoriais Suporte | Suporte.tsx | Nao |
| Timeline visual | Pedidos.tsx | Nao |
| Notas indicator | Conversas.tsx | Nao |
| Metricas conversas | Dashboard.tsx | Nao |

### Minha Recomendacao

Implementar os 4 lotes em sequencia. O Lote 1 tem o maior impacto na produtividade diaria (filtros, export, respostas rapidas). O Lote 3 (tutoriais) e essencial para onboarding de novos assinantes. Os lotes 2 e 4 sao melhorias incrementais que consolidam o que ja funciona.

Estimativa: 3-4 mensagens para implementar tudo.


## Batch 2 — Melhorias 🟡 Importantes + 🟢 Desejáveis

### 🟡 Importantes (Pedidos)
**7. Filtro por data, produto e método de pagamento** — Adicionar filtros avançados no Kanban
**8. Exportar pedidos para CSV** — Botão para download dos pedidos filtrados
**9. Detalhes do pedido em drawer** (#21 🟢) — Modal já existe, melhorar UX

### 🟡 Importantes (Conversas)
**10. Busca por nome/telefone** — Já existe campo de busca, verificar se funciona corretamente
**11. Envio de mídia no chat** — Upload de imagem/documento via WhatsApp
**12. Respostas rápidas** — Mensagens pré-salvas para uso rápido

### 🟡 Importantes (Fluxos)
**13. Estatísticas por fluxo** — Dashboard com execuções, falhas, taxa de sucesso
**14. Duplicar fluxo existente** — Botão para clonar um fluxo

### 🟢 Desejáveis
**15. Histórico de status visual (timeline)** — Já existe na aba Timeline do modal
**16. Notas internas na conversa** — Notas visíveis só para equipe
**17. Marcar conversa como resolvida/arquivada** — Status da conversa

### Arquivos envolvidos
| Arquivo | Mudança |
|---|---|
| `src/pages/Pedidos.tsx` | Filtros avançados + exportar CSV |
| `src/pages/Conversas.tsx` | Respostas rápidas + notas internas + arquivar |
| `src/pages/Fluxos.tsx` | Estatísticas por fluxo + duplicar fluxo |

### Prioridade de implementação
1. Filtros avançados + Export CSV (Pedidos) — impacto alto na produtividade
2. Duplicar fluxo + Estatísticas (Fluxos) — funcionalidade muito pedida
3. Respostas rápidas + Notas internas + Arquivar (Conversas) — gestão de atendimento

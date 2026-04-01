

# Adicionar URL de Webhook na EvolutionTab

## Problema
O campo de URL de Webhook (configurada automaticamente) foi removido durante a simplificação do componente. O usuário precisa ver essa informação com botão de copiar.

## Solução

Adicionar um campo read-only abaixo dos badges de status mostrando a URL do webhook gerada automaticamente, com botão de copiar — exatamente como na screenshot.

### Mudanças em `src/components/whatsapp/EvolutionTab.tsx`

1. Adicionar import de `Copy` do lucide-react
2. Construir a URL do webhook: `${VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook?user_id=${user.id}&provider=evolution`
3. Renderizar campo read-only com label "URL de Webhook (configurada automaticamente)" e botão de copiar
4. Posicionar entre os badges de status e o bloco de ação (criar instância / QR code / conectado)

### UI resultante
```text
URL de Webhook (configurada automaticamente)
[https://xxx.supabase.co/functions/v1/whatsapp-webhook?user_id=...&provider=evolution  📋]
```

O campo será visível em todos os estados (conectado, desconectado, QR ready).

### Arquivo alterado
| Arquivo | Ação |
|---------|------|
| `src/components/whatsapp/EvolutionTab.tsx` | Adicionar campo de webhook URL com copy button |


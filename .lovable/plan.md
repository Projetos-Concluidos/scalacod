

## Plano: Melhorar Exibição de Saldo de Tokens + Verificar Fluxo de Compra

### Problema Atual

1. **Exibição confusa**: O número grande mostra `balance` (saldo disponível) mas sem label claro. "Total Comprado" mostra `total_purchased` mas não deixa claro que inclui tokens adicionados pelo admin. Falta a fórmula: `Saldo Disponível = Total Comprado - Tokens Usados`

2. **Botão Comprar**: Já abre um modal com PIX/Cartão via MercadoPago — isso **já funciona**. Preciso apenas verificar se está operacional.

### Alterações

#### 1. `src/pages/Vozes.tsx` — Melhorar seção de tokens

Reorganizar o card de saldo para mostrar claramente:

```text
┌─────────────────────────────────────────────────┐
│  💰 Saldo Disponível                            │
│  ████  5.000                                    │
│                                                  │
│  📊 Total Adquirido: 10.000  │  🔥 Usados: 5.000│
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 50%                     │
│  Saldo = Total Adquirido − Usados               │
└─────────────────────────────────────────────────┘
```

Mudanças específicas:
- Label principal: "Saldo de Tokens" → **"Saldo Disponível"**
- "Total Comprado" → **"Total Adquirido"** (inclui compras + tokens creditados pelo admin)
- Adicionar texto explicativo: "Saldo = Total Adquirido − Tokens Usados"
- Manter o botão "Comprar" que já abre o modal de pagamento MercadoPago (PIX + Cartão)

#### 2. Verificar fluxo de compra

O modal de compra já existe com:
- Seleção PIX / Cartão de Crédito
- Chamada à edge function `purchase-tokens`
- Geração de QR Code PIX
- Crédito automático de tokens após aprovação

Vou verificar se o `MP_PLATFORM_ACCESS_TOKEN` está configurado (já está nos secrets) e se o fluxo responde corretamente.

### Escopo
- 1 arquivo: `src/pages/Vozes.tsx` (ajuste de labels e texto explicativo)
- Sem migrações, sem edge functions novas


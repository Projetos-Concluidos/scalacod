

# Exibir Link da Oferta Logzz nos Pedidos

## Resumo
Adicionar a exibição do **link de checkout da Logzz** (já importado via "Sincronizar Logzz") dentro do detalhe do pedido no Kanban, facilitando o fluxo de pedido manual pelo afiliado.

## O que já existe
- O campo `scheduling_checkout_url` já é importado da API Logzz e salvo na tabela `offers`
- O `detailOffer` já é carregado no modal de detalhes do pedido (linha 212 do Pedidos.tsx)
- Não é necessário nenhuma alteração no banco de dados ou edge functions

## Plano de implementação

### 1. Exibir link no modal de detalhes do pedido (Pedidos.tsx)
Na aba **Logística** do modal de detalhes, logo após as informações existentes de Logzz/Coinzz, adicionar uma seção visível com:
- Título: **"Link Pedido Manual"**
- O link clicável (`scheduling_checkout_url` do `detailOffer`) com ícone de link externo
- Botão de copiar ao lado para facilitar
- Destaque visual (borda verde, fundo sutil) para chamar atenção

### 2. Exibir também na lista do Kanban (card do pedido)
Adicionar um pequeno botão/ícone de link externo no card do pedido (quando `logistics_type === "logzz"` e o pedido ainda não foi enviado à Logzz) para acesso rápido sem abrir o modal.

### Arquivos modificados
- `src/pages/Pedidos.tsx` — adicionar renderização do link na aba Logística e opcionalmente no card




## Plano: Corrigir exclusao de checkout + Melhorar notificacoes toast

### Problema 1: Erro ao excluir checkout
O erro `update or delete on table "checkouts" violates foreign key constraint "orders_checkout_id_fkey"` ocorre porque existem pedidos (orders) vinculados ao checkout. Nao e possivel excluir um checkout que possui pedidos associados.

**Solucao**: Antes de tentar excluir, verificar se existem pedidos vinculados. Se existirem, exibir mensagem clara explicando que o checkout possui pedidos e nao pode ser excluido — oferecer a opcao de **desativar** em vez de excluir.

### Problema 2: Notificacoes toast sem informacao clara
As mensagens de erro mostram textos tecnicos do banco de dados. As notificacoes precisam ser mais descritivas, bonitas e com botao X para fechar.

**Solucao**: Configurar o Sonner com `closeButton: true`, `richColors: true` e `duration` adequado. Criar helper `notify` que traduz erros comuns do banco para mensagens amigaveis em portugues.

### Alteracoes

#### 1. `src/pages/Checkouts.tsx`
- No `deleteMutation`, antes de excluir verificar se existem orders vinculadas (`select count from orders where checkout_id = id`)
- Se houver pedidos: mostrar toast de aviso "Este checkout possui X pedidos e nao pode ser excluido. Desative-o em vez disso."
- Se nao houver: proceder com a exclusao normal
- Melhorar a mensagem de `onError` para traduzir o erro de FK para texto amigavel

#### 2. `src/components/ui/sonner.tsx`
- Adicionar `closeButton={true}` para exibir o X de fechar
- Adicionar `richColors={true}` para cores diferenciadas (verde sucesso, vermelho erro, amarelo aviso)
- Ajustar `duration` para 5000ms
- Melhorar estilos com bordas arredondadas e sombra premium

#### 3. `src/lib/notify.ts`
- Atualizar helper com traducao de erros comuns do Supabase (FK violation, RLS, etc.)
- Adicionar funcao `notifyError(error)` que detecta tipo de erro e traduz automaticamente

### Resultado
- Checkout com pedidos: toast amarelo "Este checkout possui pedidos vinculados e nao pode ser excluido. Use o botao de desativar."
- Checkout sem pedidos: exclui normalmente com toast verde
- Todas as notificacoes do sistema ganham botao X, cores diferenciadas e mensagens em portugues




## Plano: Filtros Avançados Inline + Visualização "Todos" por Padrão

### Problema Atual

1. **Sem "Ver Todos"**: Ao clicar num status, o kanban filtra para aquele status, mas não há como voltar a ver todos os pedidos sem recarregar a página (o `activeFilter` começa como `null`, mas visualmente não há indicação clara).
2. **Filtros Avançados em Drawer lateral**: O concorrente usa um painel colapsável **inline** (abaixo do header, acima do kanban) com filtros de Plataforma, Data, e botão Limpar — mais acessível que o drawer lateral atual.

---

### Entrega 1: Comportamento "Ver Todos" por Padrão

- `activeFilter` já inicia como `null` (mostra todos) — isso está correto
- Adicionar nos status chips um chip **"Todos"** como primeiro item, visualmente destacado quando nenhum status está selecionado
- Clicar em "Todos" seta `activeFilter = null`
- Clicar em qualquer status individual filtra apenas aquele (e clicar de novo volta para "Todos")

---

### Entrega 2: Filtros Avançados Inline (estilo concorrente)

Substituir o **Sheet/Drawer lateral** por um painel colapsável inline que aparece entre o search e os status chips:

**Layout do painel** (toggle via botão "Filtros Avançados"):
```text
┌──────────────────────────────────────────────────────────┐
│ Plataforma: [Todos] [Logzz] [Coinzz] [COD]              │
│ 📅 dd/mm/aaaa  até  📅 dd/mm/aaaa   ✕ Limpar            │
└──────────────────────────────────────────────────────────┘
```

- **Plataforma**: Toggle chips (Todos, Logzz, Coinzz, COD) — substituem o Select atual
- **Datas**: Dois inputs de data inline com label "até" entre eles
- **Limpar**: Botão ✕ que reseta todos os filtros avançados
- **Indicador ativo**: O botão "Filtros Avançados" mostra um dot colorido quando há filtros ativos (como no print do concorrente)
- Remover o Sheet/Drawer dos filtros — tudo fica inline

---

### Entrega 3: Barra de Resumo de Status (estilo concorrente)

Abaixo dos filtros, adicionar uma barra horizontal scrollável com todos os status e suas contagens, usando dots coloridos:

```text
● 0 Aguardando  ● 0 Confirmado  ● 0 Aprovado  ● 0 Agendado  ...
```

- Essa barra é **apenas informativa** (mostra contagens) E **clicável** (filtra ao clicar)
- Os status chips atuais serão convertidos para este formato mais compacto do concorrente

---

### Escopo
- **1 arquivo editado**: `src/pages/Pedidos.tsx`
- Remoção do Sheet/Drawer lateral de filtros
- Novo painel colapsável inline com filtros de plataforma + data
- Chip "Todos" nos filtros de status
- Sem migrações, sem edge functions


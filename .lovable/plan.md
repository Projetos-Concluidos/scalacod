

## Organização Visual do Dashboard e Páginas

### Problemas Identificados (dos prints)

1. **Título e filtro colados no TopBar** — sem `pt` (padding-top) no `<main>`, o conteúdo trisca na barra superior
2. **Filtro de período desalinhado** — está `flex items-start justify-between` mas sem espaçamento vertical adequado
3. **Ícone do calendário não funcional** — clica mas não abre date picker
4. **Ícone `?` (HelpCircle) não navega** — deveria ir para `/suporte`
5. **Pixel Analytics bar com 8 itens em grid de 7 colunas** — "Fila WhatsApp" quebra para linha seguinte
6. **Ícones dos stats no Pixel Analytics** — podem ser melhorados com os ícones dos prints (círculos coloridos com ícones dentro)

### Alterações Planejadas

#### 1. `src/components/AppLayout.tsx`
- Adicionar `pt-6` ao `<main>` para dar respiro entre o TopBar e o conteúdo em todas as páginas

#### 2. `src/components/TopBar.tsx`
- Botão `?` (HelpCircle): adicionar `onClick={() => navigate("/suporte")}` para navegar à página de suporte
- Reduzir padding vertical do TopBar (`py-2` em vez de `py-3/py-4`) para compactar

#### 3. `src/pages/Dashboard.tsx` — Organização principal
- **Título + Filtro**: Usar `flex-wrap` com gap adequado para mobile; adicionar `mt-2` no bloco do título
- **Calendário funcional**: Adicionar um Popover com dois Calendar pickers (De/Até) ao clicar no ícone do calendário, permitindo consultar datas anteriores com range customizado
- **Pixel Analytics bar**: Mudar grid de `md:grid-cols-7` para `grid-cols-4 md:grid-cols-8` para acomodar os 8 itens sem quebra
- **Ícones nos stats**: Adicionar os ícones Lucide correspondentes dentro de círculos coloridos (`bg-{color}/10` + ícone) ao lado de cada label, como nos prints (ícones verdes, laranjas, vermelhos)
- **Espaçamento geral**: Verificar e padronizar gaps entre seções

#### 4. `src/components/PageHeader.tsx`
- Adicionar `pt-2` para dar respiro consistente em todas as páginas que usam PageHeader

### Escopo controlado
- Apenas arquivos: `AppLayout.tsx`, `TopBar.tsx`, `Dashboard.tsx`, `PageHeader.tsx`
- Sem mudanças em lógica de dados, edge functions, ou banco de dados
- Sem alterações em outras páginas além do padding global via AppLayout

### Relatório final
Incluirei lista detalhada de cada correção aplicada.


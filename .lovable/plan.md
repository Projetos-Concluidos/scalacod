

## O que era o "Sem dados ainda" e por que foi removido

O bloco "Sem dados ainda — O pixel está ativo..." era um `EmptyState` que aparecia **abaixo do gráfico de Engajamento** quando não havia eventos de pixel registrados. O problema é que ele era **redundante**: os gráficos e cards de métricas já estavam visíveis mostrando zeros, e o empty state ocupava espaço desnecessário empurrando o layout para baixo.

## Para que serve o Pixel

O sistema de Pixel (`pixel_events` + edge function `pixel-event`) rastreia eventos dos visitantes nos seus checkouts públicos:
- **Pageviews** — quantas pessoas acessaram o checkout
- **Interações** — cliques em botões, preenchimento de campos
- **Conversões** — visitante que virou pedido

Esses dados **já aparecem no Dashboard atual** em 3 lugares:
1. **Card "Pixel Analytics"** (canto superior direito) — total de eventos
2. **Barra de métricas** — Visitantes, Pageviews, Interações, Conversão, Abandono
3. **Gráfico "Engajamento"** — Views e Interações por hora

## Plano: Melhorar a seção de Pixel no Dashboard

O que falta é um estado vazio **elegante e localizado** quando não há dados, sem quebrar o layout.

### Alterações em `src/pages/Dashboard.tsx`

1. **Gráfico de Engajamento** (linhas 269-304): Quando `metrics.pixelTotal === 0`, mostrar uma mensagem inline dentro do card do gráfico (em vez de um gráfico vazio com linhas zero), com ícone, texto explicativo e um mini-guia de como o pixel funciona.

2. **Gráfico de Tráfego & Conversões** (linhas 232-267): Mesmo tratamento — mensagem inline quando não há dados.

3. **Barra de métricas Pixel Analytics** (linhas 209-227): Manter sempre visível (já mostra zeros de forma limpa).

4. **Lógica**: Usar `const hasPixelData = metrics.pixelTotal > 0` como flag. Quando `false`, os cards dos gráficos mostram o placeholder; quando `true`, mostram os gráficos normalmente.

O placeholder inline será algo como:
- Ícone `BarChart3` com fundo `bg-primary/10`
- Título: "Sem dados de pixel ainda"
- Subtítulo: "Quando visitantes acessarem seus checkouts, os dados aparecerão aqui automaticamente em tempo real."
- Sem botão de ação (é automático)

Isso mantém o layout organizado, sem empurrar conteúdo, e informa o usuário de forma clara.


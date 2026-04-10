

# Plano: Fundo Dark com Dots Pattern no Canvas do React Flow

## O que será feito

Trocar o fundo claro atual do canvas React Flow por um fundo escuro com padrão de pontos (dots), similar à imagem de referência enviada.

## Alterações

### 1. Criar componente `BGPattern` (`src/components/ui/bg-pattern.tsx`)
- Componente reutilizável com variantes (dots, grid, stripes, etc.) e masks (fade-center, fade-edges, etc.)
- Baseado no código fornecido pelo usuário

### 2. Atualizar canvas no `FlowBuilderModal.tsx` (linhas 629-643)
- Mudar `style={{ background: "#F8FFFE" }}` para fundo escuro `#0a0a0a`
- Substituir o `<Background>` padrão do React Flow por cores compatíveis com tema dark (dots em `#252525`)
- Atualizar `Controls` e `MiniMap` para tema escuro
- Atualizar cores dos nós (`getNodeStyle`) para melhor contraste no fundo dark
- Envolver o canvas com `BGPattern` variant="dots" mask="fade-center" como layer de fundo

### Resultado visual
- Fundo preto com dots sutis e fade central, igual à imagem de referência
- Nós com melhor contraste e legibilidade
- MiniMap e Controls em tema dark consistente


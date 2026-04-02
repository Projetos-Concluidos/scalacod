

## Plano: Rebranding Logo + SEO Premium

### 1. Nova Logo — Carrinho de Compras Premium

Substituir o ícone shuriken (estrela de 4 pontas) por um **carrinho de compras estilizado** em SVG com gradiente emerald. Design: linhas finas e elegantes, cantos arredondados, com um pequeno brilho/glow — visual premium que combina com o tema BLACK COD.

O SVG será criado como componente reutilizável `ScalaCODLogo` em um único arquivo compartilhado (`src/components/ScalaCODLogo.tsx`) para evitar duplicação.

**Arquivos que usam o logo (substituir ShurikenLogo):**
- `src/components/AuthLogo.tsx` — tela de auth
- `src/components/AppSidebar.tsx` — sidebar interna
- `src/pages/Home.tsx` — navbar + footer
- `src/pages/Login.tsx` — formulário
- `src/pages/Register.tsx` — formulário

### 2. Nome "COD" com Verde Esmeralda Chamativo

Em todos os lugares onde aparece "ScalaCOD":
- "Scala" em branco/foreground
- "COD" em `text-emerald-400` (#34D399) com leve text-shadow glow emerald

### 3. Favicon

Gerar o SVG do carrinho premium como `public/favicon.svg` e atualizar `index.html` com `<link rel="icon">`. Remover `favicon.ico` se existir.

### 4. SEO / OG para WhatsApp

Problemas visíveis no print:
- URL ainda mostra "scalaninja.lovable.app" (isso é config de deploy, não código)
- Título e descrição genéricos demais
- Sem OG image real (aponta para `scalacod.com.br/og-image.png` que não existe)

**Correções em `index.html`:**
- OG title: `ScalaCOD — Seu COD no Piloto Automático`
- OG description: `Checkout híbrido Logzz + Coinzz. WhatsApp automático. Kanban em tempo real. 7 dias grátis.`
- OG URL: apontar para a URL real do deploy (`https://scalaninja.lovable.app` por enquanto)
- OG image: gerar uma imagem OG programaticamente (1200x630) com o logo + tagline e salvar em `public/og-image.png`
- Twitter card: mesmos dados atualizados
- Schema JSON-LD: atualizar descrição

### Resumo de Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/ScalaCODLogo.tsx` | **Criar** — componente SVG carrinho premium |
| `src/components/AuthLogo.tsx` | Importar novo logo |
| `src/components/AppSidebar.tsx` | Importar novo logo |
| `src/pages/Home.tsx` | Importar novo logo, estilizar "COD" |
| `src/pages/Login.tsx` | Importar novo logo |
| `src/pages/Register.tsx` | Importar novo logo |
| `public/favicon.svg` | **Criar** — favicon SVG |
| `public/og-image.png` | **Gerar** via script |
| `index.html` | Favicon + OG tags corrigidos |


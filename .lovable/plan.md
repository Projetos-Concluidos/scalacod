## Plano: Páginas Públicas + Footer Premium

### Problema
- Links do footer apontam para `#` (nao funcionam)
- Nao existem as paginas publicas: Funcionalidades, Planos, FAQ, Central de Ajuda, Status, Termos
- Footer esta simples, precisa ser premium como o concorrente (3 colunas + contato + links legais)
- Falta menu "Acesso" com Login e Criar conta

### O que sera feito

#### 1. Criar 6 paginas publicas

| Pagina | Rota | Conteudo |
|---|---|---|
| Funcionalidades | `/funcionalidades` | Grid de 8 features com icones, titulos e descricoes (Checkout COD, Automacao WhatsApp, Flow Builder, Dashboard & Pixel, Logistica Integrada, Leads & CRM, Remarketing, Webhooks & API) — inspirado no print do concorrente |
| Planos | `/planos` | 2 cards (Iniciante R$297 e Escala R$497) + card Empresarial + secao "Qual escolher?" — usando dados do CMS pricing |
| FAQ | `/faq` | Perguntas frequentes em accordion, consumindo dados do CMS faqs |
| Central de Ajuda | `/ajuda` | Hub de suporte com categorias (Primeiros Passos, Checkouts, Pedidos, WhatsApp, etc) com conteudo do Suporte.tsx adaptado para pagina publica |
| Status | `/status` | Pagina simples mostrando status dos servicos (API, WhatsApp, Checkout, Logzz) — todos "Operacional" com indicadores verdes |
| Termos | `/termos` | Termos de Uso e Politica de Privacidade em texto corrido |

Todas as paginas publicas terao: navbar com logo + links + CTA, e o novo footer premium.

#### 2. Redesenhar o Footer (premium, elegante)

Layout inspirado no print do concorrente:

```text
┌─────────────────────────────────────────────────────────────┐
│  [Logo] ScalaCOD                                            │
│  Automacao COD com checkout hibrido                         │
│                                                             │
│  PRODUTO          ACESSO         SUPORTE        CONTATO     │
│  Funcionalidades  Login          Central Ajuda  email       │
│  Planos           Criar conta    Status         WhatsApp    │
│  FAQ                             Termos                     │
│                                                             │
│  ─────────────────────────────────────────────────────────── │
│  © 2026 ScalaCOD    Termos de Uso  •  Politica de Privacid. │
└─────────────────────────────────────────────────────────────┘
```

4 colunas: Produto (Funcionalidades, Planos, FAQ), Acesso (Login, Criar conta), Suporte (Central de Ajuda, Status, Termos), Contato (email, WhatsApp).

#### 3. Atualizar Navbar da Home

Links "Recursos", "Planos", "FAQ" apontarao para as novas rotas `/funcionalidades`, `/planos`, `/faq` (com scroll suave quando na mesma pagina, ou navegacao direta).

#### 4. Registrar rotas no App.tsx

Adicionar as 6 novas rotas publicas (sem AuthGuard).

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/Funcionalidades.tsx` | **Criar** — grid de features premium |
| `src/pages/Planos.tsx` | **Criar** — cards de pricing |
| `src/pages/Faq.tsx` | **Criar** — accordion de FAQs |
| `src/pages/Ajuda.tsx` | **Criar** — central de ajuda publica |
| `src/pages/Status.tsx` | **Criar** — status dos servicos |
| `src/pages/Termos.tsx` | **Criar** — termos e privacidade |
| `src/components/PublicFooter.tsx` | **Criar** — footer premium reutilizavel |
| `src/components/PublicNavbar.tsx` | **Criar** — navbar reutilizavel para paginas publicas |
| `src/pages/Home.tsx` | Substituir footer inline pelo PublicFooter, atualizar links navbar |
| `src/App.tsx` | Adicionar 6 rotas publicas |

Nenhuma migracao de banco necessaria — tudo frontend.

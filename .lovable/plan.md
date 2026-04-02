

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
| Funcionalidades | `/funcionalidades` | Grid de 8 features com icones, titulos e descricoes (Checkout COD, Automacao WhatsApp, Flow Builder, Dashboard & Pixel, Logistica Integrada, Leads & CRM, Remarketing, Webhooks & API) |
| Planos | `/planos` | 2 cards (Iniciante R$297 e Escala R$497) + card Empresarial + secao "Qual escolher?" |
| FAQ | `/faq` | Perguntas frequentes em accordion, consumindo dados do CMS |
| Central de Ajuda | `/ajuda` | Hub de suporte com categorias (Primeiros Passos, Checkouts, Pedidos, WhatsApp, etc) |
| Status | `/status` | Status dos servicos (API, WhatsApp, Checkout, Logzz) com indicadores |
| Termos | `/termos` | Termos de Uso e Politica de Privacidade |

Todas com navbar + footer premium reutilizaveis, tema dark BLACK COD.

#### 2. Redesenhar o Footer (premium)

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

4 colunas com links reais, visual elegante dark com acentos emerald.

#### 3. Atualizar Navbar + Rotas

- Links "Recursos", "Planos", "FAQ" apontam para as novas rotas
- 6 rotas publicas adicionadas ao App.tsx (sem AuthGuard)

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/Funcionalidades.tsx` | Criar |
| `src/pages/Planos.tsx` | Criar |
| `src/pages/Faq.tsx` | Criar |
| `src/pages/Ajuda.tsx` | Criar |
| `src/pages/StatusPage.tsx` | Criar |
| `src/pages/Termos.tsx` | Criar |
| `src/components/PublicFooter.tsx` | Criar — footer premium reutilizavel |
| `src/components/PublicNavbar.tsx` | Criar — navbar reutilizavel |
| `src/pages/Home.tsx` | Usar PublicFooter + PublicNavbar |
| `src/App.tsx` | Adicionar 6 rotas |

Nenhuma migracao de banco necessaria.




## Plano: CMS Completo — Personalizar TUDO via Admin

### Problema Identificado

A Home.tsx importa `useHomeSettings` mas **quase não usa** — todos os dados estão hardcoded em arrays locais (`painPoints`, `features`, `tools`, `testimonials`, `faqs`, `logos`). O Admin CMS tem as abas mas os dados não fluem para a página real.

Login e Register são 100% hardcoded (textos, imagens, frases rotativas). SEO não tem gestão no admin.

### Mapeamento Atual vs Desejado

| Seção | Fonte Atual | Fonte Desejada |
|---|---|---|
| Home > Navbar | Hardcoded | CMS ✅ (já tem aba, falta consumir) |
| Home > Hero | Hardcoded | CMS ✅ |
| Home > Pain Points | Hardcoded array | CMS ❌ (nova seção) |
| Home > Checkout Híbrido | Hardcoded | CMS ❌ (nova seção) |
| Home > Features | Hardcoded array | CMS ✅ (já tem aba, falta consumir) |
| Home > Tools (6 cards) | Hardcoded array | CMS ❌ (nova seção) |
| Home > Testimonials | Hardcoded array | CMS ✅ (já tem aba, falta consumir) |
| Home > FAQs | Hardcoded array | CMS ❌ (nova seção) |
| Home > CTA Final | Hardcoded | CMS ✅ (já tem aba, falta consumir) |
| Home > Footer | Hardcoded | CMS ✅ (já tem aba, falta consumir) |
| Login textos + imagem | Hardcoded | CMS ❌ (nova seção) |
| Register textos + imagem | Hardcoded | CMS ❌ (nova seção) |
| SEO (meta tags, OG) | index.html estático | CMS ❌ (nova seção) |
| Sidebar brand | Hardcoded | CMS ❌ |

### Arquitetura da Solução

Usar a tabela `home_settings` existente com novas `section_key`:

```text
SEÇÕES EXISTENTES (manter):     NOVAS SEÇÕES (criar):
├── navbar                      ├── pain_points
├── hero                        ├── checkout_section
├── logos                       ├── tools
├── features                   ├── faqs
├── pricing                    ├── login_page
├── testimonials               ├── register_page
├── cta_final                  ├── seo
└── footer                     └── brand (sidebar/topbar)
```

### Implementação — 4 Etapas

#### 1. `src/hooks/useHomeSettings.ts` — Expandir interface + defaults
Adicionar tipos para as 8 novas seções: `pain_points`, `checkout_section`, `tools`, `faqs`, `login_page`, `register_page`, `seo`, `brand`. Cada uma com defaults que espelham o conteúdo hardcoded atual.

#### 2. `src/pages/admin/AdminHome.tsx` — Adicionar novas abas ao CMS
- **Pain Points** — editor de cards (emoji, problem, pain, solution) com add/remove
- **Checkout Section** — título, subtítulo, steps editáveis
- **Tools** — editor de 6 cards (icon, name, description, badge)
- **FAQs** — editor de perguntas/respostas com add/remove
- **Login** — textos (título, subtítulo, frases rotativas), upload de imagem lateral
- **Register** — textos (título, subtítulo, frases, benefits), upload de imagem lateral
- **SEO** — meta title, description, keywords, OG title, OG description, OG image (upload)
- **Brand** — nome da marca, subtítulo sidebar, email suporte, WhatsApp suporte
- **Imagens** — expandir com slots para login_bg e register_bg

#### 3. `src/pages/Home.tsx` — Consumir TODOS os dados do CMS
Remover os arrays hardcoded (`painPoints`, `features`, `tools`, `testimonials`, `faqs`, `logos`) e substituir pelos dados de `useHomeSettings()`. Cada seção lê do objeto `s` retornado pelo hook, com fallback nos defaults.

#### 4. `src/pages/Login.tsx` e `Register.tsx` — Consumir CMS
Importar `useHomeSettings` e usar os campos de `login_page` / `register_page` para: título, subtítulo, frases rotativas, imagem lateral.

### Arquivos Alterados

| Arquivo | Ação |
|---|---|
| `src/hooks/useHomeSettings.ts` | Expandir interface com 8 novas seções |
| `src/pages/admin/AdminHome.tsx` | Adicionar 8 novas abas com editores |
| `src/pages/Home.tsx` | Remover hardcoded, consumir CMS |
| `src/pages/Login.tsx` | Consumir `login_page` do CMS |
| `src/pages/Register.tsx` | Consumir `register_page` do CMS |

Sem migração necessária — a tabela `home_settings` já aceita qualquer `section_key` com `content` JSONB.


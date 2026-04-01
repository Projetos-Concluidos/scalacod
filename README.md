# 🥷 ScalaNinja

Plataforma SaaS multi-tenant para vendas COD (Cash on Delivery) com checkout inteligente, automação WhatsApp e analytics completo.

## Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — Auth, Database, Edge Functions, Storage
- **Integrações:** Logzz, Coinzz, MercadoPago, ElevenLabs, Evolution API, Meta WhatsApp

## Setup em 5 passos

### 1. Clone e instale

```bash
git clone <repo-url>
cd scalaninja
npm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
```

> **Nota:** Se estiver usando Lovable Cloud, o `.env` é preenchido automaticamente.

### 3. Configure secrets das Edge Functions

No painel Lovable Cloud → Secrets, adicione:

| Secret | Descrição | Onde obter |
|--------|-----------|------------|
| `MP_PLATFORM_ACCESS_TOKEN` | MercadoPago access token | [MP Developers](https://www.mercadopago.com.br/developers) |
| `ELEVENLABS_API_KEY` | API key ElevenLabs | [ElevenLabs](https://elevenlabs.io) |
| `APP_ENCRYPTION_KEY` | Chave hex 64 chars | `openssl rand -hex 32` |

### 4. Rode em desenvolvimento

```bash
npm run dev
```

### 5. Build para produção

```bash
npm run build
```

## Estrutura do projeto

```
src/
├── components/     # Componentes reutilizáveis
├── contexts/       # AuthContext, MobileSidebarContext
├── hooks/          # Custom hooks
├── integrations/   # Cliente Supabase (auto-gerado)
├── lib/            # Utilitários (notify, pixel, status-mapping)
├── pages/          # Rotas da aplicação
supabase/
├── functions/      # Edge Functions (API, webhooks, pagamentos)
├── migrations/     # Migrações SQL
```

## Principais funcionalidades

- **Checkout híbrido** — CEP verifica Logzz (COD) ou Coinzz (Correios + pagamento online)
- **Kanban de pedidos** — Drag & drop com sync automático via webhooks
- **Fluxos WhatsApp** — Builder visual com templates prontos por status de pedido
- **Vozes IA** — Geração de áudios com ElevenLabs para automações
- **Disparos em massa** — Campanhas WhatsApp com templates Meta aprovados
- **Admin multi-tenant** — Gestão de assinantes, planos e integrações globais

## Licença

Proprietário — Todos os direitos reservados.

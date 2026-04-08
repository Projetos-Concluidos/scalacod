# Tutorial: Deploy do ScalaCOD na Hostinger

> Guia completo passo a passo para colocar o ScalaCOD 100% online usando Hostinger (frontend) + Supabase (backend).

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│   HOSTINGER (Frontend)       │     │   SUPABASE (Backend)         │
│                              │     │                              │
│   - HTML/CSS/JS estáticos   │────▶│   - PostgreSQL Database      │
│   - React SPA (Vite build)  │     │   - Edge Functions (Deno)    │
│   - Domínio customizado     │     │   - Auth (GoTrue)            │
│   - SSL automático          │     │   - Storage                  │
│                              │     │   - Realtime                 │
└─────────────────────────────┘     └─────────────────────────────┘
```

**O ScalaCOD é um SPA (Single Page Application)**. A Hostinger serve apenas os arquivos estáticos. Todo o backend roda no Supabase.

---

## Pré-requisitos

- [ ] Conta na [Hostinger](https://www.hostinger.com.br/) (plano com hospedagem web)
- [ ] Conta no [Supabase](https://supabase.com/) (plano Free ou Pro)
- [ ] Código do projeto no GitHub (repositório privado)
- [ ] Node.js 18+ instalado no computador local
- [ ] Supabase CLI instalado (`npm install -g supabase`)

---

## Parte 1: Configurar o Supabase

### 1.1 Criar projeto no Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **New Project**
3. Escolha um nome (ex: `scalacod-prod`)
4. Defina uma senha forte para o banco de dados
5. Selecione a região **South America (São Paulo)** para menor latência
6. Clique em **Create new project**
7. Aguarde ~2 minutos até o projeto estar pronto

### 1.2 Anotar as credenciais

No dashboard do Supabase, vá em **Settings → API** e copie:

```
Project URL:        https://xxxxx.supabase.co
Anon/Public Key:    eyJhbGciOi...
Service Role Key:   eyJhbGciOi... (NUNCA exponha no frontend!)
```

No **Settings → Database** copie:

```
Connection String:  postgresql://postgres:[SENHA]@db.xxxxx.supabase.co:5432/postgres
```

### 1.3 Importar o banco de dados

Use o arquivo `database-schema.sql` incluído no projeto:

**Opção A — Via Supabase SQL Editor:**

1. No dashboard, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo do arquivo `database-schema.sql`
4. Clique em **Run**
5. Aguarde a execução (pode levar 1-2 minutos)

**Opção B — Via CLI:**

```bash
# No terminal, na pasta do projeto
psql "postgresql://postgres:[SENHA]@db.xxxxx.supabase.co:5432/postgres" < database-schema.sql
```

### 1.4 Configurar autenticação

No dashboard Supabase:

1. Vá em **Authentication → Providers → Email**
2. Ative **Enable Email Provider**
3. **Desative** "Confirm email" se quiser login sem verificação (não recomendado)
4. Em **Authentication → URL Configuration**:
   - Site URL: `https://seudominio.com.br`
   - Redirect URLs: `https://seudominio.com.br/reset-password`

### 1.5 Configurar Secrets

No dashboard Supabase, vá em **Settings → Edge Functions → Secrets** e adicione:

| Secret | Valor | Onde obter |
|--------|-------|------------|
| `MP_PLATFORM_ACCESS_TOKEN` | Token do MercadoPago | [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) → Credenciais |
| `ELEVENLABS_API_KEY` | API Key do ElevenLabs | [elevenlabs.io](https://elevenlabs.io) → Profile → API Keys |

### 1.6 Deploy das Edge Functions

```bash
# Login no Supabase CLI
supabase login

# Linkar ao projeto
supabase link --project-ref xxxxx

# Deploy de todas as functions
supabase functions deploy
```

Isso fará deploy de TODAS as 30+ Edge Functions automaticamente.

### 1.7 Configurar Cron Jobs

No **SQL Editor** do Supabase, execute:

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Processar fila de mensagens a cada 5 minutos
SELECT cron.schedule(
  'process-message-queue-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xxxxx.supabase.co/functions/v1/process-message-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Lembretes de entrega às 8h
SELECT cron.schedule(
  'delivery-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xxxxx.supabase.co/functions/v1/delivery-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- Expirar pedidos não pagos a cada hora
SELECT cron.schedule(
  'expire-unpaid-orders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xxxxx.supabase.co/functions/v1/expire-unpaid-orders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Processar remarketing a cada hora
SELECT cron.schedule(
  'process-remarketing-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xxxxx.supabase.co/functions/v1/process-remarketing',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
    body := '{"time": "hourly"}'::jsonb
  ) AS request_id;
  $$
);
```

> ⚠️ **Substitua** `xxxxx` pelo Project Ref e `SUA_ANON_KEY` pela Anon Key.

### 1.8 Configurar Storage

No dashboard Supabase, vá em **Storage** e crie os buckets:

1. Clique em **New Bucket**
2. Crie `audio` → marque como **Public**
3. Crie `home-images` → marque como **Public**

### 1.9 Criar primeiro superadmin

1. Registre uma conta normalmente na aplicação
2. No SQL Editor do Supabase, execute:

```sql
-- Primeiro, encontre o ID do usuário
SELECT id, email FROM auth.users WHERE email = 'seuemail@exemplo.com';

-- Depois, adicione o role de superadmin
INSERT INTO public.user_roles (user_id, role)
VALUES ('ID_DO_USUARIO_AQUI', 'superadmin');
```

---

## Parte 2: Build do Frontend

### 2.1 Clonar o repositório

```bash
git clone https://github.com/seuusuario/scalacod.git
cd scalacod
```

### 2.2 Instalar dependências

```bash
npm install
# ou
bun install
```

### 2.3 Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
VITE_SUPABASE_PROJECT_ID=xxxxx
```

### 2.4 Build de produção

```bash
npm run build
```

Isso gera a pasta `dist/` com todos os arquivos estáticos.

### 2.5 Verificar o build

```bash
# Testar localmente
npx serve dist
# Acesse http://localhost:3000
```

---

## Parte 3: Deploy na Hostinger

### 3.1 Acessar o hPanel

1. Faça login em [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Selecione seu plano de hospedagem

### 3.2 Configurar domínio

1. Vá em **Domínios** → **Adicionar domínio**
2. Aponte seu domínio para os nameservers da Hostinger:
   - `ns1.dns-parking.com`
   - `ns2.dns-parking.com`
3. Aguarde propagação DNS (até 24-48h, geralmente 1-2h)

### 3.3 Upload dos arquivos

**Opção A — Via File Manager:**

1. No hPanel, vá em **Gerenciador de Arquivos**
2. Navegue até `public_html`
3. **Delete** todos os arquivos existentes
4. Clique em **Upload** e faça upload de TODOS os arquivos da pasta `dist/`
5. A estrutura deve ficar:
```
public_html/
├── index.html
├── assets/
│   ├── index-xxxxx.js
│   ├── index-xxxxx.css
│   └── ...
├── favicon.svg
├── robots.txt
└── sitemap.xml
```

**Opção B — Via FTP (FileZilla):**

1. No hPanel, vá em **Arquivos → Contas FTP**
2. Crie uma conta FTP ou use a existente
3. No FileZilla:
   - Host: `ftp.seudominio.com.br`
   - Usuário: conforme criado
   - Senha: conforme criado
   - Porta: 21
4. Navegue até `public_html` no servidor
5. Faça upload de todo o conteúdo da pasta `dist/`

**Opção C — Via Git (recomendado):**

1. No hPanel, vá em **Avançado → Git**
2. Conecte seu repositório GitHub
3. Configure o branch `main`
4. Após cada push, acesse via SSH e execute:
```bash
cd ~/public_html
npm install && npm run build
cp -r dist/* .
```

### 3.4 Configurar .htaccess (CRÍTICO!)

Como o ScalaCOD é um **SPA com client-side routing**, você precisa redirecionar todas as rotas para `index.html`. Crie o arquivo `.htaccess` em `public_html/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Se o arquivo ou diretório existe, servir diretamente
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Redirecionar todas as rotas para index.html
  RewriteRule ^ index.html [QSA,L]
</IfModule>

# Compressão GZIP
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>

# Cache de assets estáticos (1 ano)
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Headers de segurança
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

> ⚠️ **Sem este arquivo, o refresh de página (F5) em qualquer rota que não seja `/` retornará erro 404!**

### 3.5 Configurar SSL

1. No hPanel, vá em **Segurança → SSL**
2. Ative o certificado SSL gratuito (Let's Encrypt)
3. Ative **Forçar HTTPS**

### 3.6 Verificar

1. Acesse `https://seudominio.com.br` — deve mostrar a landing page
2. Acesse `https://seudominio.com.br/login` — deve mostrar a tela de login
3. Acesse `https://seudominio.com.br/dashboard` — deve redirecionar para login
4. Registre uma conta e teste o fluxo completo

---

## Parte 4: Webhooks (Configuração final)

Após o deploy, configure os webhooks nos providers:

### 4.1 Logzz

Na plataforma Logzz, configure o webhook de status para:
```
https://xxxxx.supabase.co/functions/v1/logzz-webhook
```

### 4.2 Hyppe

Na plataforma Hyppe, configure o webhook para:
```
https://xxxxx.supabase.co/functions/v1/hyppe-webhook
```

### 4.3 Coinzz

Na plataforma Coinzz, configure o webhook para:
```
https://xxxxx.supabase.co/functions/v1/coinzz-webhook
```

### 4.4 MercadoPago

No painel de desenvolvedor do MercadoPago, configure:
- Webhook de pagamento: `https://xxxxx.supabase.co/functions/v1/mp-payment-webhook`
- Webhook de assinatura: `https://xxxxx.supabase.co/functions/v1/mp-subscription-webhook`
- Webhook de fatura: `https://xxxxx.supabase.co/functions/v1/mp-invoice-webhook`

### 4.5 WhatsApp (Evolution API ou Meta)

Configure o webhook de mensagens recebidas para:
```
https://xxxxx.supabase.co/functions/v1/whatsapp-webhook
```

---

## Parte 5: Checklist Final

- [ ] Landing page carrega corretamente
- [ ] SSL ativo (HTTPS)
- [ ] .htaccess configurado (rotas SPA funcionam)
- [ ] Registro e login funcionam
- [ ] Dashboard carrega após login
- [ ] Superadmin criado no banco
- [ ] Edge Functions deployed no Supabase
- [ ] Cron jobs configurados
- [ ] Webhooks dos providers configurados
- [ ] Storage buckets criados (audio, home-images)
- [ ] Secrets configurados (MercadoPago, ElevenLabs)
- [ ] Domínio customizado apontando corretamente

---

## Troubleshooting

### Erro 404 ao atualizar página
→ Verifique se o `.htaccess` está corretamente na pasta `public_html/`

### "Failed to fetch" no checkout
→ Verifique se `VITE_SUPABASE_URL` está correto no `.env` antes do build

### Edge Functions não respondem
→ Execute `supabase functions deploy` novamente e verifique os logs no dashboard

### Cron jobs não executam
→ Verifique se as extensões `pg_cron` e `pg_net` estão habilitadas no Supabase

### Webhook da Logzz não atualiza status
→ Verifique se a URL do webhook está correta e se a Edge Function está deployed

### WhatsApp não envia mensagens
→ Verifique a instância WhatsApp em Configurações → WhatsApp e teste a conexão

---

## Atualizações Futuras

Para atualizar o frontend após mudanças:

```bash
# Puxa as mudanças
git pull origin main

# Instala dependências (se houver novas)
npm install

# Build
npm run build

# Upload dos arquivos da pasta dist/ para public_html/
```

Para atualizar o backend (Edge Functions):

```bash
# Deploy de todas as functions
supabase functions deploy

# Ou apenas uma function específica
supabase functions deploy nome-da-function
```

Para migrações do banco:

```bash
# Aplica migrações pendentes
supabase db push
```

---

**Pronto! Seu ScalaCOD está 100% online! 🚀**

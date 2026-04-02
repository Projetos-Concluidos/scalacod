

## Plano: Calculadora de Custo Justo de Tokens no Admin

### Contexto

Atualmente o admin não tem visibilidade do custo real da plataforma por token. O provedor ativo é OpenAI TTS (`tts-1-hd`), que custa **US$ 0,030 por 1.000 caracteres** (1 token = 1 caractere). Com câmbio ~R$ 5,20, isso dá **R$ 0,000156 por token**.

Os packs atuais cobram ~R$ 0,00398/token, gerando margem de ~96%. A calculadora ajudará o admin a entender o custo real e definir preços justos.

### Funcionalidade: Nova aba "🧮 Calculadora" no AdminTokens

Adicionar uma **4a aba** na página `/admin/tokens`:

**Seção 1 — Parâmetros de custo**:
- Campo "Custo API por 1.000 tokens (USD)": default 0.030 (OpenAI tts-1-hd) — editável
- Campo "Câmbio USD/BRL": default 5.20 — editável
- Campo "Taxa gateway (%)": default 4.99 (MercadoPago) — editável
- Custo real por token calculado automaticamente em BRL

**Seção 2 — Simulador de Pack**:
- Campo "Quantidade de tokens" (input numérico)
- Exibe automaticamente:
  - Custo da plataforma (API + gateway)
  - Preço sugerido com margens de 30%, 50%, 80%, 100%
  - Lucro estimado por venda
- Tabela comparativa com as 4 margens lado a lado

**Seção 3 — Análise dos Packs Atuais**:
- Lista os packs existentes da tabela `token_packs`
- Para cada pack mostra: custo real, preço atual, margem real (%), lucro por venda
- Indicador visual: verde (margem saudável >50%), amarelo (30-50%), vermelho (<30%)
- Mostra se o pack tem desconto por volume comparado ao menor pack

### Escopo
- **1 arquivo editado**: `src/pages/admin/AdminTokens.tsx` (nova aba "Calculadora")
- Sem migrações, sem edge functions
- Tudo calculado no frontend com os dados já disponíveis


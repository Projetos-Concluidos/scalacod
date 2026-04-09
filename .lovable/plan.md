

## Plano: Checkout Geral com Personalização Premium

### Resumo

Criar um novo tipo de checkout **"Geral"** focado em vender qualquer produto (cursos, info produtos, serviços, dropshipping) com pagamento exclusivamente via MercadoPago. O editor terá personalização completa do visual, CTA, timer de escassez, tarjas, e campos condicionais por tipo de produto.

### O que muda

Hoje existe apenas um wizard de 4 passos para criar checkouts COD/Híbrido. Vamos adicionar:

1. **Dois botões na página Checkouts**: "Novo Checkout COD" (atual) e "Novo Checkout Geral" (novo)
2. **Wizard expandido do Checkout Geral** com 6 passos:
   - Passo 1: Produto & Tipo (Dropshipping, Curso, Info Produto, Serviço)
   - Passo 2: Personalização Visual (cores, fontes, CTA, timer escassez, tarjas)
   - Passo 3: Order Bump & Upsell
   - Passo 4: Pagamento (MercadoPago: PIX, Cartão, Boleto)
   - Passo 5: Tracking & Pixels (UTM, Facebook, Google)
   - Passo 6: Links & Extras (download, thank you page, CSS)

3. **Campos condicionais por tipo**:
   - **Curso/Info Produto**: link de acesso/download, sem campo de endereço no checkout público
   - **Serviço**: sem endereço, campo de observações
   - **Dropshipping**: endereço obrigatório, frete

### Detalhes Técnicos

#### 1. Migração de Banco de Dados
Adicionar colunas na tabela `checkouts`:
- `checkout_category` (text): `'cod'` | `'general'` -- diferencia COD vs Geral
- `product_type` (text): `'dropshipping'` | `'curso'` | `'info_produto'` | `'servico'`
- `cta_config` (jsonb): título, ícone, cores, fontes, tamanho do botão CTA
- `scarcity_timer_config` (jsonb): ativo, duração em minutos, cor de fundo, texto
- `banner_images` (jsonb): array de URLs de tarjas/banners abaixo do CTA
- `download_url` (text): link de download pós-compra
- `primary_color` (text), `font_family` (text)
- `product_cover_url` (text): imagem de capa estilo hero

#### 2. Refatoração da Página Checkouts (src/pages/Checkouts.tsx)
- Separar em componentes menores dentro de `src/components/checkout/`:
  - `CheckoutList.tsx` - listagem com filtro COD/Geral
  - `CheckoutWizardCOD.tsx` - wizard atual (extraído)
  - `CheckoutWizardGeneral.tsx` - novo wizard de 6 passos
  - `StepProductType.tsx` - seleção de tipo com cards visuais
  - `StepVisualCustomization.tsx` - cores, fontes, CTA, timer, tarjas
  - `StepOrderBumpUpsell.tsx` - reutiliza lógica atual + melhorias
  - `StepPaymentConfig.tsx` - configuração MercadoPago
  - `StepTracking.tsx` - pixels e UTM
  - `StepExtras.tsx` - download link, thank you, CSS, preview

#### 3. Checkout Público (src/pages/CheckoutPublic.tsx)
- Detectar `checkout_category === 'general'` e renderizar layout premium:
  - Imagem de capa hero responsiva
  - Título do produto em caixa alta
  - Timer de escassez vermelho no topo (configurável)
  - Tarjas/banners abaixo do CTA
  - CTA customizado (cor, texto, ícone, fonte)
  - Campos condicionais: sem endereço para curso/serviço
  - Pagamento MercadoPago integrado (já existe a lógica, reutilizar)

#### 4. Aba Order Bump & Upsell
- Dentro do menu Checkouts, adicionar tabs: **Meus Checkouts** | **Order Bumps & Upsells**
- Tela de gerenciamento independente para cadastrar produtos de bump/upsell
- Vincular bumps a checkouts específicos

#### 5. Detalhes do Pedido
- No modal de detalhes, exibir dados de order bumps e upsells comprados
- Mostrar valor individual de cada bump no demonstrativo financeiro

#### 6. Disparo de Mensagens (já funciona)
- Confirmar que mudanças manuais no Kanban já disparam `trigger-flow` -- já implementado
- Garantir que pedidos do checkout geral também passem pelo mesmo fluxo

### Arquivos Modificados
| Arquivo | Ação |
|---|---|
| `src/pages/Checkouts.tsx` | Refatorar: extrair componentes, adicionar tabs e botões |
| `src/components/checkout/*.tsx` | Criar ~8 novos componentes |
| `src/pages/CheckoutPublic.tsx` | Adicionar renderização condicional para checkout geral |
| Migração SQL | Adicionar colunas na tabela `checkouts` |

### Fases de Entrega (esta primeira fase)
1. Migração DB + novos campos
2. Refatorar Checkouts.tsx em componentes
3. Wizard do Checkout Geral (6 passos com personalização completa)
4. Aba Order Bumps & Upsells
5. Checkout público com visual premium para tipo Geral

### O que fica para fase 2 (futuro)
- Preview em tempo real do checkout dentro do editor
- Templates prontos de checkout
- A/B testing entre checkouts
- Upsell pós-compra (página intermediária após pagamento)
- Galeria de imagens do produto (múltiplas fotos)


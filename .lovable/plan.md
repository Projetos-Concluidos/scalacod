

## Respostas + Plano de Melhorias no Checkout

---

### Respostas às suas perguntas

**Diferença entre tipos de Checkout (Padrão, Express, Hibrido):**
Atualmente os 3 tipos são **apenas um label visual** — o campo `type` é salvo no banco mas **não altera nenhum comportamento** no checkout público. Todos os checkouts seguem o mesmo fluxo de 3-4 steps. Para funcionar de verdade:
- **Padrão**: Fluxo completo (dados → endereço → entrega/pagamento → confirmação)
- **Express**: Formulário simplificado em 1 step só (nome, telefone, CEP, tudo junto) para conversão rápida
- **Híbrido**: O fluxo atual multi-step (já implementado)

**CSS Customizado:**
Funciona sim. O CSS é injetado via `<style>{checkout.custom_css}</style>` no checkout público. Qualquer CSS válido que target elementos da página será aplicado. Porém não existem classes CSS documentadas para facilitar.

**CSS de teste para copiar e colar:**
```css
/* Muda cor do botão principal */
button.bg-emerald-500, .bg-emerald-500 {
  background-color: #7c3aed !important;
}
/* Header do checkout */
header { background: linear-gradient(135deg, #1e3a5f, #0d1b2a) !important; }
header span { color: #fff !important; }
/* Cards com borda roxa */
.rounded-2xl { border-color: #7c3aed33 !important; }
/* Resumo do pedido - fundo */
.sticky { background: #faf5ff !important; border-color: #7c3aed22 !important; }
```

---

### Plano de Implementação

#### 1. Quantidade visível e destaque no Resumo do Pedido

**Problema**: Mostra "1 unidade(s)" fixo em texto pequeno. O nome do checkout (ex: "KIT 2 ORGANIC LIZZ") indica a quantidade mas não é extraído.

**Solução**:
- Extrair quantidade do nome do checkout usando regex (ex: "KIT 2" → qty=2, "1 ORGANIC" → qty=1)
- Exibir quantidade em destaque grande (badge ou número grande) no resumo
- Usar o nome do **produto** no resumo e o nome do **checkout** como título H1

#### 2. Melhor aproveitamento do espaço no Resumo

- Imagem do produto maior (de 64px para 80px)
- Nome do produto com fonte maior e sem truncate
- Preço em destaque maior
- Quantidade como badge grande colorido (ex: "2x" em verde grande)
- Espaçamento melhorado entre seções

#### 3. Implementar diferença real dos tipos de Checkout

- **Express**: Renderizar formulário em 1 único step (nome, telefone, CPF, CEP, número — tudo junto), sem collapse/expand
- **Padrão**: Fluxo atual multi-step mantido como está
- **Híbrido**: Igual ao Padrão (comportamento atual)

#### 4. Classes CSS documentadas para customização

Adicionar classes semânticas nos elementos principais do checkout para facilitar CSS customizado:
- `.checkout-header`, `.checkout-form`, `.checkout-summary`, `.checkout-step`, `.checkout-btn-primary`, `.checkout-trust-badges`

---

### Detalhes Técnicos

**Arquivo editado**: `src/pages/CheckoutPublic.tsx`

**Extração de quantidade**:
```text
const extractQty = (name: string) => {
  const match = name.match(/^(\d+)\s|kit\s*(\d+)/i);
  return parseInt(match?.[1] || match?.[2] || "1");
};
const quantity = extractQty(checkout.name);
```

**Resumo melhorado**: O componente `OrderSummary` será reescrito para usar melhor o espaço com imagem maior, quantidade em badge e preço destacado.

**Checkout Express**: Condicional `checkout.type === "express"` renderiza 1 form único em vez dos steps animados.




## Relatório de Teste: Admin > Gerenciar Home Page

### Status Geral: ✅ Código funcional, ⚠️ Dados desatualizados

### Estrutura do CMS (17 abas)

| Aba | Código | Dados no DB | Status |
|---|---|---|---|
| Navbar | ✅ Editor genérico | ✅ Existe | ⚠️ logo_text = "ScalaNinja" |
| Hero | ✅ Editor genérico | ✅ Existe | ✅ OK |
| Logos | ✅ Editor genérico | ✅ Existe | ✅ OK |
| Pain Points | ✅ Editor dedicado | ✅ 3 cards | ✅ OK |
| Checkout | ✅ Editor dedicado | ✅ 4 steps | ✅ OK |
| Features | ✅ Editor dedicado | ✅ 3 items | ✅ OK |
| Tools | ✅ Editor dedicado | ✅ 6 items | ✅ OK |
| Depoimentos | ✅ Editor dedicado | ✅ 3 items | ✅ OK |
| FAQs | ✅ Editor dedicado | ✅ 5 items | ✅ OK |
| Pricing | ✅ Editor genérico | ✅ Existe | ✅ OK |
| CTA Final | ✅ Editor genérico | ✅ Existe | ✅ OK |
| Footer | ✅ Editor genérico | ✅ Existe | ⚠️ logo_text/copyright = "ScalaNinja" |
| Login | ✅ Editor dedicado | ✅ Existe | ✅ OK |
| Cadastro | ✅ Editor dedicado | ✅ Existe | ✅ OK |
| SEO | ✅ Editor dedicado | ✅ Existe | ✅ OK |
| Marca | ✅ Editor dedicado | ✅ Existe | ✅ OK |
| Imagens | ✅ Upload com 7 slots | ✅ Bucket existe | ✅ OK |

### Problemas Encontrados

#### 1. ⚠️ Dados "ScalaNinja" persistem no DB (navbar + footer)
O rebranding atualizou os **defaults no código** mas não atualizou os **dados já salvos** no banco. Como o CMS prioriza dados do DB sobre defaults, o navbar e footer ainda mostram "ScalaNinja".

**Correção:** Atualizar os registros `navbar` e `footer` no banco para "ScalaCOD".

#### 2. ⚠️ Acesso ao Admin via Browser Tool bloqueado
O AdminGuard verifica `profile?.role === "superadmin"` mas a sessão do browser tool não compartilha a sessão do preview do usuário. Teste manual é necessário pelo usuário na preview.

**Nota:** Isso NÃO é um bug — é comportamento correto de segurança.

### Plano de Correção

**1 ação:** Atualizar os dados `navbar` e `footer` no banco para corrigir "ScalaNinja" → "ScalaCOD":

```sql
-- navbar: logo_text ScalaNinja → ScalaCOD
UPDATE home_settings 
SET content = jsonb_set(content, '{logo_text}', '"ScalaCOD"')
WHERE section_key = 'navbar';

-- footer: logo_text e copyright
UPDATE home_settings 
SET content = jsonb_set(
  jsonb_set(content, '{logo_text}', '"ScalaCOD"'),
  '{copyright}', '"© 2026 ScalaCOD. Feito com ❤️ no Pará."'
)
WHERE section_key = 'footer';
```

Apenas 1 migração SQL. Nenhum arquivo de código precisa ser alterado.


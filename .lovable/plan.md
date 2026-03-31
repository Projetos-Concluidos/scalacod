

# Plano: Busca com Filtro no Dropdown de Ofertas Logzz

## Problema
O dropdown atual usa `Select` simples do shadcn/ui, que não permite busca/filtro. Com muitas ofertas, é difícil encontrar a desejada.

## Solução
Substituir o `Select` por um **Combobox** usando os componentes `Command` + `Popover` (já existem no projeto em `src/components/ui/command.tsx` e `popover.tsx`). Isso permite digitar para filtrar ofertas por nome, descrição, preço ou hash.

## Mudanças

### `src/pages/Checkouts.tsx`
1. Adicionar state `logzzSearch` (string) e `logzzPopoverOpen` (boolean)
2. Substituir o bloco `<Select>` (linhas 353-370) por um `Popover` + `Command`:
   - `CommandInput` com placeholder "Buscar por nome, preço, hash..."
   - `CommandList` com `CommandEmpty` ("Nenhuma oferta encontrada")
   - `CommandItem` para cada oferta, exibindo `Nome — Oferta (R$ preço) [role]`
   - O `cmdk` já faz fuzzy search nativo no texto de cada item
3. Ao selecionar um item, executar a mesma lógica atual (preencher nome, slug, toast)
4. Mostrar a oferta selecionada no botão trigger do Popover

Nenhum outro arquivo precisa ser alterado. Os componentes `Command` e `Popover` já estão disponíveis.


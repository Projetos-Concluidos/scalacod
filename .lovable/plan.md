

## Plano: Sincronizar Logzz no Order Bump (Step 2) + Labels de Afiliado

### Problema

No Step 2 do wizard, a busca de order bumps consulta apenas a tabela local `offers`, que pode conter hashes de **produtor**. Não há botão "Sincronizar Logzz" como no Step 1, então não é possível importar a oferta correta (de afiliado) para o bump.

### Alterações em `src/pages/Checkouts.tsx`

**1. Botão "Importar Logzz" no Step 2 (Order Bump)**
- Adicionar botão `↻ Importar Logzz` acima do campo de busca de bumps, reutilizando o mesmo estado (`logzzOffers`, `syncingLogzz`)

**2. Combobox Logzz para selecionar Order Bump**
- Quando `logzzOffers` tem dados, exibir Combobox (Command + Popover) idêntico ao Step 1
- Ao selecionar: upsert produto/oferta no banco + adicionar ao `formBumps` com o **hash do afiliado**
- Se `logzzOffers` vazio, manter busca local como fallback

**3. Labels claros com role + hash em AMBOS os steps**

Cada item exibe:
```text
Organic Lizz — 2 Organic Lizz 127
R$ 127,00 · afiliado · salrq52e
```

Badges coloridos por role:
- **afiliado** → verde
- **produtor** → amarelo
- **coprodutor** → azul

**4. Hash correto no bump**
- Ao selecionar oferta da Logzz como bump, salva `hash: offer_hash` do afiliado na tabela `order_bumps`

### Escopo
- 1 arquivo: `src/pages/Checkouts.tsx`
- Sem migrações de banco, sem mudanças em edge functions


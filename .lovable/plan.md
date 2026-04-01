

## Corrigir ícones do Pixel Analytics bar

Os ícones estão em containers `h-9 w-9` com `rounded-xl` — muito grandes. O print de referência mostra ícones pequenos inline antes do texto do label, sem container grande.

### Alteração em `src/pages/Dashboard.tsx` (linhas 291-303)

Remover o container `div` com `h-9 w-9 rounded-xl` e colocar o ícone pequeno (`h-3.5 w-3.5`) diretamente ao lado do label, na mesma linha:

**De:**
```
<div className="flex items-center gap-3 px-4">
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{backgroundColor}}>
    <IconComp className="h-4 w-4" style={{color}} />
  </div>
  <div>
    <span className="text-[10px] ...">LABEL</span>
    <p className="text-xl ...">VALUE</p>
  </div>
</div>
```

**Para:**
```
<div className="flex flex-col items-center gap-1 px-4">
  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
    <IconComp className="h-3.5 w-3.5" style={{color}} />
    {stat.label}
  </span>
  <p className="text-lg font-extrabold text-foreground leading-tight">{stat.value}</p>
</div>
```

Isso replica o layout do print: ícone pequeno colorido + label na mesma linha, valor abaixo, tudo centralizado no card.


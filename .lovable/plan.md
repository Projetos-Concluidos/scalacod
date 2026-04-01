

## Plano: Efeito Gradient Animado Emerald no Highlight Word do Hero

### O que muda

A palavra destacada no Hero (ex: "Ninja") ganha um efeito premium com gradiente animado em tons de **Emerald**, mantendo a identidade visual do ScalaCOD. São 3 camadas sobrepostas:

1. **Texto com gradiente animado** — radial-gradient que se move (emerald claro → emerald → emerald escuro)
2. **Glow blur** — cópia com `blur(10px)` criando brilho difuso verde
3. **Noise overlay** — textura sutil com SVG inline

### Paleta de cores (Emerald)

```text
Original:  rgb(208,178,255) → rgb(255,238,216) → rgb(232,64,13)
                roxo              dourado             laranja

Novo:      rgb(167,243,208) → rgb(16,185,129)  → rgb(6,95,70)
           emerald-200          emerald-500         emerald-800
```

O gradiente vai de um verde claro luminoso, passando pelo emerald principal, até um verde escuro profundo — criando profundidade e movimento premium sem sair da identidade visual.

### Alterações

#### 1. `src/index.css` — Keyframes do gradiente

```css
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.animate-gradient-shift {
  animation: gradient-shift 4s ease infinite;
}
```

#### 2. `src/pages/Home.tsx` — Span do highlight_word com 3 camadas

Trocar o `<span className="text-emerald-500">` por:

```tsx
<span className="relative inline-block">
  {/* Camada 1: texto com gradiente emerald animado */}
  <span
    className="animate-gradient-shift"
    style={{
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      backgroundSize: '200% 200%',
      backgroundImage: 'radial-gradient(80% 109% at 44% 35%,
        rgb(167,243,208) 0%,
        rgb(16,185,129) 43%,
        rgb(6,95,70) 88%)',
    }}
  >
    {highlightWord}
  </span>
  {/* Camada 2: glow blur */}
  <span aria-hidden="true" style={{
    position:'absolute', inset:0,
    backgroundClip:'text', color:'transparent',
    backgroundSize:'200% 200%',
    backgroundImage: 'radial-gradient(...mesmo gradiente...)',
    filter:'blur(10px)', mixBlendMode:'screen', opacity:0.8,
    pointerEvents:'none', zIndex:2,
  }} className="animate-gradient-shift">
    {highlightWord}
  </span>
  {/* Camada 3: noise overlay (SVG inline) */}
  <span style={{
    backgroundImage:'url("data:image/svg+xml,...")',
    backgroundSize:'60%', borderRadius:'8px',
    inset:'-6px 0 0 -6px', mixBlendMode:'overlay',
    position:'absolute', zIndex:3, pointerEvents:'none',
  }} />
</span>
```

### Escopo
- 2 arquivos: `src/index.css`, `src/pages/Home.tsx`
- Sem banco, sem edge functions


const ShurikenLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="shuriken-grad" x1="0" y1="0" x2="32" y2="32">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <path d="M16 2L20 12L30 16L20 20L16 30L12 20L2 16L12 12Z" fill="url(#shuriken-grad)" />
    <circle cx="16" cy="16" r="3" fill="#F8FFFE" />
  </svg>
);

const AuthLogo = () => (
  <div className="flex flex-col items-center gap-2 mb-8">
    <ShurikenLogo size={48} />
    <div className="text-center">
      <h1 className="text-2xl font-bold">
        <span className="text-foreground">Scala</span>
        <span className="text-primary">Ninja</span>
      </h1>
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Obsidian Edition
      </span>
    </div>
  </div>
);

export default AuthLogo;

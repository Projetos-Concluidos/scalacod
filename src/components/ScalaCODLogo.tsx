const ScalaCODLogo = ({ size = 32, centerFill = "#030712" }: { size?: number; centerFill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cart-grad" x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
      <filter id="cart-glow">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g filter="url(#cart-glow)">
      {/* Cart body */}
      <path
        d="M6 8H8.5L12 22H24L27 11H10.5"
        stroke="url(#cart-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cart handle */}
      <path
        d="M4 6H6L8.5 8"
        stroke="url(#cart-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Wheels */}
      <circle cx="14" cy="26" r="2" fill="url(#cart-grad)" />
      <circle cx="22" cy="26" r="2" fill="url(#cart-grad)" />
      {/* Inner dot — premium touch */}
      <circle cx="18" cy="15" r="1.5" fill={centerFill} opacity="0.6" />
    </g>
  </svg>
);

export const ScalaCODBrandName = ({ scalaClass = "text-white", codClass = "text-emerald-400", className = "" }: {
  scalaClass?: string;
  codClass?: string;
  className?: string;
}) => (
  <span className={className}>
    <span className={scalaClass}>Scala</span>
    <span className={`${codClass}`} style={{ textShadow: "0 0 12px rgba(52,211,153,0.5)" }}>COD</span>
  </span>
);

export default ScalaCODLogo;

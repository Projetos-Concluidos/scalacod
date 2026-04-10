import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowPulse = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.4, 1]);

  // Logo
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA
  const ctaOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaY = interpolate(frame, [30, 50], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // URL
  const urlOpacity = interpolate(frame, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030712",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        gap: 20,
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(16,185,129,${glowPulse * 0.12}) 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>Scala</span>
          <span
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#34D399",
              letterSpacing: "-1px",
              textShadow: `0 0 20px rgba(52,211,153,${glowPulse * 0.5})`,
            }}
          >
            COD
          </span>
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: "white", letterSpacing: "1px" }}>
          AUTOMATIZE SUA OPERAÇÃO DE
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#34D399",
            letterSpacing: "2px",
            textShadow: `0 0 25px rgba(52,211,153,${glowPulse * 0.4})`,
          }}
        >
          CASH ON DELIVERY AGORA
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          opacity: urlOpacity,
          fontSize: 16,
          fontWeight: 400,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "4px",
        }}
      >
        scalacod.com
      </div>
    </AbsoluteFill>
  );
};

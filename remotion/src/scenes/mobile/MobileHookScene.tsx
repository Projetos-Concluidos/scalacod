import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["700", "800"], subsets: ["latin"] });

export const MobileHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowPulse = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.3, 1]);

  // Hook text slam in
  const hookScale = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 200 } });
  const hookOpacity = interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Sub text
  const subOpacity = interpolate(frame, [60, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(frame, [60, 85], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Icon pulse
  const iconScale = spring({ frame: frame - 30, fps, config: { damping: 8, stiffness: 150 } });

  // Logo
  const logoOpacity = interpolate(frame, [100, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [200, 240], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Particles
  const particles = [...Array(8)].map((_, i) => {
    const angle = (i / 8) * Math.PI * 2 + frame * 0.012;
    const radius = 160 + Math.sin(frame * 0.02 + i * 2) * 40;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const pOpacity = interpolate(frame, [20, 50], [0, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          width: 3 + (i % 2),
          height: 3 + (i % 2),
          borderRadius: "50%",
          backgroundColor: "#10B981",
          opacity: pOpacity * fadeOut,
          top: `calc(42% + ${y}px)`,
          left: `calc(50% + ${x}px)`,
        }}
      />
    );
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030712",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        opacity: fadeOut,
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(16,185,129,${glowPulse * 0.15}) 0%, transparent 70%)`,
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {particles}

      {/* Warning icon */}
      <div style={{ opacity: hookOpacity, transform: `scale(${iconScale})`, marginBottom: 30 }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>

      {/* Hook text */}
      <div
        style={{
          opacity: hookOpacity,
          transform: `scale(${interpolate(hookScale, [0, 1], [0.6, 1])})`,
          textAlign: "center",
          maxWidth: "85%",
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 800, color: "white", lineHeight: 1.2, letterSpacing: "-1px" }}>
          AINDA GERENCIANDO
        </div>
        <div style={{ fontSize: 42, fontWeight: 800, color: "white", lineHeight: 1.2, letterSpacing: "-1px" }}>
          PEDIDOS
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: "#F59E0B",
            lineHeight: 1.2,
            letterSpacing: "-1px",
            textShadow: `0 0 30px rgba(245,158,11,${glowPulse * 0.5})`,
          }}
        >
          MANUALMENTE?
        </div>
      </div>

      {/* Sub text */}
      <div
        style={{
          opacity: subOpacity,
          transform: `translateY(${subY}px)`,
          marginTop: 30,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "3px" }}>
          CONHEÇA O
        </div>
      </div>

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
        <span style={{ fontSize: 36, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>Scala</span>
        <span
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#34D399",
            letterSpacing: "-1px",
            textShadow: `0 0 20px rgba(52,211,153,0.5)`,
          }}
        >
          COD
        </span>
      </div>
    </AbsoluteFill>
  );
};

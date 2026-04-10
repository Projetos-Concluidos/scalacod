import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Glow pulse
  const glowIntensity = interpolate(Math.sin(frame * 0.04), [-1, 1], [0.3, 0.9]);

  // Icon
  const iconScale = spring({ frame: frame - 30, fps, config: { damping: 12, stiffness: 100 } });
  const iconOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "Scala"
  const scalaX = spring({ frame: frame - 60, fps, config: { damping: 20, stiffness: 150 } });
  const scalaOpacity = interpolate(frame, [60, 85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "COD"
  const codX = spring({ frame: frame - 80, fps, config: { damping: 15, stiffness: 120 } });
  const codOpacity = interpolate(frame, [80, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Tagline
  const tagOpacity = interpolate(frame, [130, 160], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [130, 160], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtitle line
  const subOpacity = interpolate(frame, [170, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(frame, [170, 200], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [260, 300], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Particles
  const particles = [...Array(12)].map((_, i) => {
    const angle = (i / 12) * Math.PI * 2 + frame * 0.006;
    const radius = 220 + Math.sin(frame * 0.015 + i * 1.5) * 50;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const pOpacity = interpolate(frame, [40, 80], [0, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          width: 3 + (i % 3),
          height: 3 + (i % 3),
          borderRadius: "50%",
          backgroundColor: "#10B981",
          opacity: pOpacity * fadeOut,
          top: `calc(50% + ${y}px)`,
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
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        opacity: fadeOut,
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(16,185,129,${glowIntensity * 0.14}) 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {particles}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ opacity: iconOpacity, transform: `scale(${iconScale})` }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: 80,
                fontWeight: 800,
                color: "white",
                opacity: scalaOpacity,
                transform: `translateX(${interpolate(scalaX, [0, 1], [-30, 0])}px)`,
                letterSpacing: "-2px",
              }}
            >
              Scala
            </span>
            <span
              style={{
                fontSize: 80,
                fontWeight: 800,
                color: "#34D399",
                opacity: codOpacity,
                transform: `translateX(${interpolate(codX, [0, 1], [-20, 0])}px)`,
                letterSpacing: "-2px",
                textShadow: `0 0 ${30 * glowIntensity}px rgba(52,211,153,0.6), 0 0 ${60 * glowIntensity}px rgba(52,211,153,0.3)`,
              }}
            >
              COD
            </span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: tagOpacity,
            transform: `translateY(${tagY}px)`,
            fontSize: 22,
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "5px",
            textTransform: "uppercase",
          }}
        >
          ESCALA, CONTROLE E AUTOMAÇÃO
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontSize: 16,
            fontWeight: 400,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "3px",
            textTransform: "uppercase",
          }}
        >
          EM UMA ÚNICA PLATAFORMA
        </div>
      </div>
    </AbsoluteFill>
  );
};

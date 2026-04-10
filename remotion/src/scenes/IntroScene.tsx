import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background pulse
  const bgPulse = interpolate(frame, [0, 240], [0, 360], { extrapolateRight: "clamp" });

  // Cart icon scale in
  const iconScale = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 100 } });
  const iconOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "Scala" text
  const scalaX = spring({ frame: frame - 50, fps, config: { damping: 20, stiffness: 150 } });
  const scalaOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "COD" text with glow
  const codX = spring({ frame: frame - 70, fps, config: { damping: 15, stiffness: 120 } });
  const codOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtitle
  const subOpacity = interpolate(frame, [110, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(frame, [110, 140], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Glow pulse
  const glowIntensity = interpolate(Math.sin(frame * 0.05), [-1, 1], [0.3, 0.8]);

  // Fade out at end
  const fadeOut = interpolate(frame, [200, 240], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      {/* Radial glow background */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(16,185,129,${glowIntensity * 0.15}) 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 + frame * 0.008;
        const radius = 200 + Math.sin(frame * 0.02 + i) * 40;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const particleOpacity = interpolate(frame, [30, 60], [0, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: "#10B981",
              opacity: particleOpacity,
              top: `calc(50% + ${y}px)`,
              left: `calc(50% + ${x}px)`,
            }}
          />
        );
      })}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Cart icon */}
          <div
            style={{
              opacity: iconOpacity,
              transform: `scale(${iconScale})`,
              fontSize: 64,
            }}
          >
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
          </div>

          {/* Brand text */}
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

        {/* Subtitle */}
        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontSize: 22,
            fontWeight: 400,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "6px",
            textTransform: "uppercase",
          }}
        >
          AFILIADO PRO
        </div>
      </div>
    </AbsoluteFill>
  );
};

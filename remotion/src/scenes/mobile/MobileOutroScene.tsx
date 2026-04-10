import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });

export const MobileOutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowPulse = interpolate(Math.sin(frame * 0.07), [-1, 1], [0.4, 1]);

  // Logo
  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA line 1
  const cta1Opacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cta1Y = interpolate(frame, [30, 50], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA line 2
  const cta2Opacity = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cta2Y = interpolate(frame, [50, 70], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // URL
  const urlOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Decorative line
  const lineWidth = interpolate(frame, [90, 130], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030712",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
        gap: 24,
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(16,185,129,${glowPulse * 0.14}) 0%, transparent 70%)`,
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
          gap: 12,
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
        <span style={{ fontSize: 48, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>Scala</span>
        <span
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: "#34D399",
            letterSpacing: "-1px",
            textShadow: `0 0 25px rgba(52,211,153,${glowPulse * 0.5})`,
          }}
        >
          COD
        </span>
      </div>

      {/* Separator line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)",
          borderRadius: 1,
        }}
      />

      {/* CTA */}
      <div style={{ textAlign: "center", maxWidth: "85%" }}>
        <div
          style={{
            opacity: cta1Opacity,
            transform: `translateY(${cta1Y}px)`,
            fontSize: 28,
            fontWeight: 700,
            color: "white",
            letterSpacing: "1px",
            lineHeight: 1.3,
          }}
        >
          AUTOMATIZE SEU
        </div>
        <div
          style={{
            opacity: cta2Opacity,
            transform: `translateY(${cta2Y}px)`,
            fontSize: 36,
            fontWeight: 800,
            color: "#34D399",
            letterSpacing: "1px",
            lineHeight: 1.3,
            textShadow: `0 0 30px rgba(52,211,153,${glowPulse * 0.4})`,
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
          fontWeight: 600,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "5px",
          textTransform: "uppercase",
        }}
      >
        scalacod.com
      </div>
    </AbsoluteFill>
  );
};

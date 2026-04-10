import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin"] });

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowPulse = interpolate(Math.sin(frame * 0.04), [-1, 1], [0.4, 1]);

  // Logo entrance
  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA text
  const ctaOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ctaY = interpolate(frame, [60, 90], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // URL
  const urlOpacity = interpolate(frame, [100, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA button
  const btnScale = spring({ frame: frame - 140, fps, config: { damping: 10, stiffness: 80 } });
  const btnOpacity = interpolate(frame, [140, 160], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      {/* Central glow */}
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
          gap: 16,
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
        }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontSize: 56, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>
            Scala
          </span>
          <span
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "#34D399",
              letterSpacing: "-1px",
              textShadow: `0 0 20px rgba(52,211,153,${glowPulse * 0.6})`,
            }}
          >
            COD
          </span>
        </div>
      </div>

      {/* CTA Text */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          textAlign: "center",
          maxWidth: 900,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "white",
            lineHeight: 1.3,
            letterSpacing: "1px",
          }}
        >
          AUTOMATIZE SUA OPERAÇÃO DE
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#34D399",
            lineHeight: 1.4,
            letterSpacing: "2px",
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
          fontSize: 18,
          fontWeight: 400,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "4px",
        }}
      >
        scalacod.com
      </div>

      {/* CTA Button */}
      <div
        style={{
          opacity: btnOpacity,
          transform: `scale(${btnScale})`,
          background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
          padding: "14px 40px",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 700,
          color: "white",
          letterSpacing: "1px",
          boxShadow: `0 0 ${30 * glowPulse}px rgba(16,185,129,0.4), 0 4px 20px rgba(0,0,0,0.3)`,
        }}
      >
        COMEÇAR TRIAL GRÁTIS →
      </div>
    </AbsoluteFill>
  );
};

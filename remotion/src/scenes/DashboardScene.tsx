import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";
import { TextOverlay } from "../components/TextOverlay";

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Enter
  const enterScale = spring({ frame, fps, config: { damping: 25, stiffness: 80 } });
  const scale = interpolate(enterScale, [0, 1], [0.88, 0.9]);
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slow zoom
  const zoom = interpolate(frame, [60, 480], [0.9, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pan slightly right to show data section
  const panX = interpolate(frame, [100, 350], [0, -30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Cursor animation - move to "15 dias" filter
  const cursorOpacity = interpolate(frame, [120, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorX = interpolate(frame, [140, 200, 210, 300], [700, 1050, 1050, 850], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [140, 200, 210, 300], [500, 115, 115, 380], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Click
  const clickScale = frame >= 200 && frame <= 212
    ? interpolate(frame, [200, 206, 212], [1, 0.6, 1], { extrapolateRight: "clamp" })
    : 1;

  // Cursor fade out after click
  const cursorFadeOut = interpolate(frame, [300, 340], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtle drift
  const driftY = Math.sin(frame * 0.006) * 5;

  // Text overlays
  const textDashboard = interpolate(frame, [50, 80, 350, 380], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textRealtime = interpolate(frame, [230, 260, 430, 460], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [440, 480], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030712",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: opacity * fadeOut,
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 500,
          background: "radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)",
          top: "55%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        style={{
          transform: `scale(${zoom}) translateX(${panX}px) translateY(${driftY}px)`,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame screenSrc={staticFile("images/dashboard-main.png")} />
      </div>

      {/* Cursor */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          opacity: cursorOpacity * cursorFadeOut,
          transform: `scale(${clickScale})`,
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L5.86 2.36a.5.5 0 0 0-.86.35V3.21z" />
        </svg>
      </div>

      {/* Overlays */}
      <TextOverlay text="DASHBOARD COMPLETO" opacity={textDashboard} position="bottom" />
      <TextOverlay text="OPERAÇÃO EM TEMPO REAL" opacity={textRealtime} position="bottom" />
    </AbsoluteFill>
  );
};

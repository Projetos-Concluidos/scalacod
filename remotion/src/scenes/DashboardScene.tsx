import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";

export const DashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // MacBook enters from below
  const enterY = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const macY = interpolate(enterY, [0, 1], [200, -20]);

  // Fade in
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slow zoom into the screen
  const scale = interpolate(frame, [60, 600], [0.85, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtle pan to the right (showing the data section)
  const panX = interpolate(frame, [120, 400], [0, -40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Cursor simulation
  const cursorOpacity = interpolate(frame, [150, 170], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  
  // Cursor moves to "15 dias" filter position
  const cursorX = interpolate(frame, [170, 220, 230, 280], [700, 1050, 1050, 900], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [170, 220, 230, 280], [500, 112, 112, 350], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Click animation
  const clickScale = frame >= 220 && frame <= 230
    ? interpolate(frame, [220, 225, 230], [1, 0.7, 1], { extrapolateRight: "clamp" })
    : 1;

  // Fade out
  const fadeOut = interpolate(frame, [560, 600], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 400,
          background: "radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)",
          top: "60%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        style={{
          transform: `translateY(${macY}px) scale(${scale}) translateX(${panX}px)`,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame screenSrc={staticFile("images/dashboard-main.png")} />
      </div>

      {/* Animated cursor */}
      <div
        style={{
          position: "absolute",
          left: cursorX,
          top: cursorY,
          opacity: cursorOpacity * (frame < 300 ? 1 : interpolate(frame, [300, 340], [1, 0], { extrapolateRight: "clamp" })),
          transform: `scale(${clickScale})`,
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
          <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L5.86 2.36a.5.5 0 0 0-.86.35V3.21z" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { IPhoneFrame } from "../../components/IPhoneFrame";
import { MobileTextOverlay } from "../../components/MobileTextOverlay";

export const MobileDashboardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Enter
  const enterScale = spring({ frame, fps, config: { damping: 22, stiffness: 90 } });
  const scale = interpolate(enterScale, [0, 1], [0.85, 1.1]);
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Phase 1: dashboard-main (0-480)
  // Phase 2: dashboard-scroll (480-840)
  const isScrollPhase = frame >= 480;
  const phaseFrame = isScrollPhase ? frame - 480 : frame;

  // Zoom progressively into data area
  const zoom = isScrollPhase
    ? interpolate(phaseFrame, [0, 360], [1.15, 1.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(frame, [30, 480], [1.1, 1.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scroll within each phase
  const scrollMain = interpolate(frame, [60, 450], [0, 70], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scrollDetail = isScrollPhase
    ? interpolate(phaseFrame, [20, 320], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  // Cursor for filter click (at frame 100-180)
  const cursorOpacity = interpolate(frame, [80, 100, 180, 210], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorX = interpolate(frame, [100, 150], [540 * 0.5, 540 * 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [100, 150], [800, 460], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const clickScale = frame >= 150 && frame <= 162
    ? interpolate(frame, [150, 156, 162], [1, 0.6, 1], { extrapolateRight: "clamp" })
    : 1;

  // Drift
  const driftX = Math.sin(frame * 0.006) * 4;

  // Text overlays
  const text1 = interpolate(frame, [40, 65, 220, 250], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const text2 = interpolate(frame, [200, 230, 440, 470], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const text3 = isScrollPhase
    ? interpolate(phaseFrame, [50, 80, 280, 310], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  // Phase transition
  const mainFade = isScrollPhase ? interpolate(phaseFrame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;

  // Fade out
  const fadeOut = isScrollPhase
    ? interpolate(phaseFrame, [320, 360], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

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
          width: 500,
          height: 700,
          background: "radial-gradient(ellipse, rgba(16,185,129,0.07) 0%, transparent 70%)",
          top: "45%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        style={{
          transform: `scale(${zoom}) translateX(${driftX}px)`,
          transformOrigin: "center center",
          opacity: mainFade,
        }}
      >
        <IPhoneFrame
          screenSrc={staticFile(isScrollPhase ? "images/dashboard-scroll.png" : "images/dashboard-main.png")}
          scrollPercent={isScrollPhase ? scrollDetail : scrollMain}
          screenZoom={1.8}
        />
      </div>

      {/* Cursor */}
      {!isScrollPhase && (
        <div
          style={{
            position: "absolute",
            left: cursorX,
            top: cursorY,
            opacity: cursorOpacity,
            transform: `scale(${clickScale})`,
            pointerEvents: "none",
            zIndex: 100,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}>
            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L5.86 2.36a.5.5 0 0 0-.86.35V3.21z" />
          </svg>
        </div>
      )}

      <MobileTextOverlay text="DASHBOARD INTELIGENTE" opacity={text1} position="bottom" size="lg" />
      <MobileTextOverlay text="VENDAS EM TEMPO REAL" opacity={text2} position="bottom" size="md" accent />
      <MobileTextOverlay text="ANALYTICS & PERFORMANCE" opacity={text3} position="bottom" size="md" />
    </AbsoluteFill>
  );
};

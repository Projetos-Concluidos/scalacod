import { AbsoluteFill, useCurrentFrame, interpolate, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";
import { TextOverlay } from "../components/TextOverlay";

export const DashboardScrollScene: React.FC = () => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scroll simulation
  const scrollProgress = interpolate(frame, [30, 280], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slow zoom
  const scale = interpolate(frame, [0, 360], [1.0, 1.1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slight upward pan
  const panY = interpolate(frame, [0, 300], [10, -15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Drift
  const driftX = Math.sin(frame * 0.007) * 6;

  // Text
  const textOpacity = interpolate(frame, [80, 110, 260, 290], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [310, 360], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030712",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeIn * fadeOut,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 400,
          background: "radial-gradient(ellipse, rgba(16,185,129,0.05) 0%, transparent 70%)",
          top: "60%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        style={{
          transform: `scale(${scale}) translateY(${panY}px) translateX(${driftX}px)`,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame
          screenSrc={staticFile("images/dashboard-scroll.png")}
          scrollPercent={scrollProgress}
        />
      </div>

      <TextOverlay text="ANALYTICS & PERFORMANCE" opacity={textOpacity} position="bottom" />
    </AbsoluteFill>
  );
};

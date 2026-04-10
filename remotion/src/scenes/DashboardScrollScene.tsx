import { AbsoluteFill, useCurrentFrame, interpolate, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";

export const DashboardScrollScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Continue zoomed in, showing scrolled dashboard
  const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pan upward to simulate scroll
  const panY = interpolate(frame, [0, 300], [0, -30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slow zoom
  const scale = interpolate(frame, [0, 420], [1.05, 1.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [370, 420], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          background: "radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)",
          top: "60%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        style={{
          transform: `scale(${scale}) translateY(${panY}px)`,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame screenSrc={staticFile("images/dashboard-scroll.png")} />
      </div>
    </AbsoluteFill>
  );
};

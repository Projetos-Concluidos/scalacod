import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";
import { TextOverlay } from "../components/TextOverlay";

export const FluxosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Enter
  const enterScale = spring({ frame, fps, config: { damping: 22, stiffness: 90 } });
  const scale = interpolate(enterScale, [0, 1], [0.9, 0.87]);
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Zoom
  const zoom = interpolate(frame, [30, 420], [0.87, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scroll to show all flows
  const scrollProgress = interpolate(frame, [80, 340], [0, 75], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Drift
  const driftY = Math.sin(frame * 0.006) * 4;

  // Text
  const textOpacity = interpolate(frame, [50, 80, 300, 330], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [370, 420], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      <div
        style={{
          transform: `scale(${zoom}) translateY(${driftY}px)`,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame
          screenSrc={staticFile("images/fluxos.png")}
          scrollPercent={scrollProgress}
        />
      </div>

      <TextOverlay text="FLUXOS AUTOMATIZADOS" opacity={textOpacity} position="bottom" />
    </AbsoluteFill>
  );
};

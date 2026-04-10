import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";
import { TextOverlay } from "../components/TextOverlay";

export const ConversasScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Enter with scale
  const enterScale = spring({ frame, fps, config: { damping: 20, stiffness: 100 } });
  const scale = interpolate(enterScale, [0, 1], [0.92, 0.88]);
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slow zoom toward chat area
  const zoom = interpolate(frame, [30, 480], [0.88, 1.02], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pan toward center chat
  const panX = interpolate(frame, [60, 300], [0, -25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const panY = interpolate(frame, [60, 300], [0, -10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Drift
  const driftX = Math.sin(frame * 0.007) * 5;

  // Text
  const textOpacity = interpolate(frame, [50, 80, 350, 380], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [430, 480], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          transform: `scale(${zoom}) translateX(${panX + driftX}px) translateY(${panY}px)`,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame screenSrc={staticFile("images/conversas.png")} />
      </div>

      <TextOverlay text="CONVERSAS CENTRALIZADAS" opacity={textOpacity} position="bottom" />
    </AbsoluteFill>
  );
};

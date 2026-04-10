import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { IPhoneFrame } from "../../components/IPhoneFrame";
import { MobileTextOverlay } from "../../components/MobileTextOverlay";

export const MobileConversasScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const scale = interpolate(enterScale, [0, 1], [0.9, 1.15]);
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pan into chat area
  const zoom = interpolate(frame, [20, 480], [1.15, 1.45], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scrollProgress = interpolate(frame, [40, 350], [0, 50], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const driftX = Math.sin(frame * 0.007) * 4;

  const textOpacity = interpolate(frame, [40, 65, 350, 380], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
          transform: `scale(${zoom}) translateX(${driftX}px)`,
          transformOrigin: "center center",
        }}
      >
        <IPhoneFrame
          screenSrc={staticFile("images/conversas.png")}
          scrollPercent={scrollProgress}
          screenZoom={1.7}
        />
      </div>

      <MobileTextOverlay text="CONVERSAS CENTRALIZADAS" opacity={textOpacity} position="bottom" size="md" />
    </AbsoluteFill>
  );
};

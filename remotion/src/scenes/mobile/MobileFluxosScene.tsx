import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { IPhoneFrame } from "../../components/IPhoneFrame";
import { MobileTextOverlay } from "../../components/MobileTextOverlay";

export const MobileFluxosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterScale = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  const scale = interpolate(enterScale, [0, 1], [0.9, 1.15]);
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const zoom = interpolate(frame, [20, 480], [1.15, 1.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scrollProgress = interpolate(frame, [50, 380], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const driftY = Math.sin(frame * 0.006) * 4;

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
          transform: `scale(${zoom}) translateY(${driftY}px)`,
          transformOrigin: "center center",
        }}
      >
        <IPhoneFrame
          screenSrc={staticFile("images/fluxos.png")}
          scrollPercent={scrollProgress}
          screenZoom={1.6}
        />
      </div>

      <MobileTextOverlay text="AUTOMAÇÃO REAL" opacity={textOpacity} position="bottom" size="lg" accent />
    </AbsoluteFill>
  );
};

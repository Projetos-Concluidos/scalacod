import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { IPhoneFrame } from "../../components/IPhoneFrame";
import { MobileTextOverlay } from "../../components/MobileTextOverlay";

export const MobilePedidosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Enter from right
  const enterX = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });
  const phoneX = interpolate(enterX, [0, 1], [200, 0]);
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Zoom into kanban
  const zoom = interpolate(frame, [20, 600], [1.1, 1.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scroll
  const scrollProgress = interpolate(frame, [60, 400], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Focus zoom on a specific order (mid scene)
  const focusZoom = interpolate(frame, [250, 350, 400, 450], [1, 1.12, 1.12, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Drift
  const driftY = Math.sin(frame * 0.006) * 4;

  // Text
  const text1 = interpolate(frame, [40, 65, 220, 250], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const text2 = interpolate(frame, [300, 330, 500, 530], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      <div
        style={{
          transform: `translateX(${phoneX}px) translateY(${driftY}px) scale(${zoom * focusZoom})`,
          transformOrigin: "center center",
        }}
      >
        <IPhoneFrame
          screenSrc={staticFile("images/pedidos.png")}
          scrollPercent={scrollProgress}
          screenZoom={1.6}
        />
      </div>

      <MobileTextOverlay text="CONTROLE TOTAL" opacity={text1} position="bottom" size="lg" />
      <MobileTextOverlay text="GESTÃO OPERACIONAL VISUAL" opacity={text2} position="bottom" size="md" accent />
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";
import { TextOverlay } from "../components/TextOverlay";

export const PedidosScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Enter from right
  const enterX = spring({ frame, fps, config: { damping: 25, stiffness: 90 } });
  const macX = interpolate(enterX, [0, 1], [200, 0]);
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scale
  const scale = interpolate(frame, [30, 660], [0.86, 0.98], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scroll within the kanban
  const scrollProgress = interpolate(frame, [120, 500], [0, 70], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Zoom into a specific order area (mid-video)
  const focusZoom = interpolate(frame, [300, 420, 480, 540], [1, 1.15, 1.15, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const focusX = interpolate(frame, [300, 420, 480, 540], [0, -80, -80, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const focusY = interpolate(frame, [300, 420, 480, 540], [0, -40, -40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Drift
  const driftY = Math.sin(frame * 0.005) * 4;

  // Text
  const textControl = interpolate(frame, [60, 90, 250, 280], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textKanban = interpolate(frame, [350, 380, 540, 570], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [610, 660], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          transform: `translateX(${macX}px) scale(${scale * focusZoom}) translateX(${focusX}px) translateY(${focusY + driftY}px)`,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame
          screenSrc={staticFile("images/pedidos.png")}
          scrollPercent={scrollProgress}
        />
      </div>

      <TextOverlay text="CONTROLE DE PEDIDOS" opacity={textControl} position="bottom" />
      <TextOverlay text="GESTÃO OPERACIONAL VISUAL" opacity={textKanban} position="bottom" />
    </AbsoluteFill>
  );
};

import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { IPhoneFrame } from "../../components/IPhoneFrame";
import { MobileTextOverlay } from "../../components/MobileTextOverlay";

export const MobileHomepageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone enters from bottom
  const enterY = spring({ frame, fps, config: { damping: 20, stiffness: 80 } });
  const phoneY = interpolate(enterY, [0, 1], [400, 0]);
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Zoom into the hero
  const zoom = interpolate(frame, [30, 360], [1, 1.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Scroll
  const scrollProgress = interpolate(frame, [80, 300], [0, 60], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Drift
  const driftY = Math.sin(frame * 0.008) * 5;

  // Text
  const textOpacity = interpolate(frame, [40, 65, 280, 310], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [330, 360], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          width: 400,
          height: 600,
          background: "radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div
        style={{
          transform: `translateY(${phoneY + driftY}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <IPhoneFrame
          screenSrc={staticFile("images/homepage.png")}
          scrollPercent={scrollProgress}
          screenZoom={1.5}
        />
      </div>

      <MobileTextOverlay text="MARCA FORTE & MODERNA" opacity={textOpacity} position="bottom" size="md" />
    </AbsoluteFill>
  );
};

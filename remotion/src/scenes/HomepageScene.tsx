import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";
import { TextOverlay } from "../components/TextOverlay";

export const HomepageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // MacBook enters from below
  const enterY = spring({ frame, fps, config: { damping: 22, stiffness: 70 } });
  const macY = interpolate(enterY, [0, 1], [300, 0]);
  const opacity = interpolate(frame, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Slow zoom in
  const scale = interpolate(frame, [30, 540], [0.82, 0.95], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pan up to simulate scroll - use CSS object-position to reveal bottom of image
  const scrollProgress = interpolate(frame, [120, 440], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtle camera drift
  const driftX = Math.sin(frame * 0.008) * 8;

  // Text overlay
  const textOpacity = interpolate(frame, [60, 90, 400, 430], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out
  const fadeOut = interpolate(frame, [490, 540], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          transform: `translateY(${macY}px) scale(${scale}) translateX(${driftX}px)`,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame
          screenSrc={staticFile("images/homepage.png")}
          scrollPercent={scrollProgress}
        />
      </div>

      {/* Text overlay */}
      <TextOverlay
        text="MARCA FORTE & MODERNA"
        opacity={textOpacity}
        position="bottom"
      />
    </AbsoluteFill>
  );
};

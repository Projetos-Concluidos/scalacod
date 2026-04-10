import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { IPhoneFrame } from "../../components/IPhoneFrame";
import { MobileTextOverlay } from "../../components/MobileTextOverlay";

const cuts = [
  { src: "images/checkouts.png", label: "Checkouts" },
  { src: "images/leads.png", label: "Leads" },
  { src: "images/configuracoes.png", label: "Configurações" },
];

const FRAMES_PER_CUT = 100;

export const MobileQuickCutsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cutIndex = Math.min(Math.floor(frame / FRAMES_PER_CUT), cuts.length - 1);
  const cutFrame = frame - cutIndex * FRAMES_PER_CUT;
  const cut = cuts[cutIndex];

  const enterScale = spring({ frame: cutFrame, fps, config: { damping: 22, stiffness: 140 } });
  const scale = interpolate(enterScale, [0, 1], [0.9, 1.15]);
  const opacity = interpolate(cutFrame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const zoom = interpolate(cutFrame, [0, FRAMES_PER_CUT], [1.15, 1.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scrollProgress = interpolate(cutFrame, [10, 80], [0, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const labelOpacity = interpolate(cutFrame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cutFadeOut = cutFrame > FRAMES_PER_CUT - 15
    ? interpolate(cutFrame, [FRAMES_PER_CUT - 15, FRAMES_PER_CUT], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  const overallFade = interpolate(frame, [260, 300], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030712",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: overallFade,
      }}
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          opacity: opacity * cutFadeOut,
          transformOrigin: "center center",
        }}
      >
        <IPhoneFrame
          screenSrc={staticFile(cut.src)}
          scrollPercent={scrollProgress}
          screenZoom={1.5}
        />
      </div>

      <MobileTextOverlay text={cut.label.toUpperCase()} opacity={labelOpacity * cutFadeOut} position="bottom" size="md" />
    </AbsoluteFill>
  );
};

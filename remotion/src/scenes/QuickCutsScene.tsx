import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["600"], subsets: ["latin"] });

const cuts = [
  { src: "images/checkouts.png", label: "Checkouts" },
  { src: "images/leads.png", label: "Leads" },
  { src: "images/configuracoes.png", label: "Configurações" },
];

const FRAMES_PER_CUT = 80; // ~1.33s per cut

export const QuickCutsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cutIndex = Math.min(Math.floor(frame / FRAMES_PER_CUT), cuts.length - 1);
  const cutFrame = frame - cutIndex * FRAMES_PER_CUT;
  const cut = cuts[cutIndex];

  // Enter
  const enterScale = spring({ frame: cutFrame, fps, config: { damping: 25, stiffness: 130 } });
  const scale = interpolate(enterScale, [0, 1], [0.93, 0.88]);
  const opacity = interpolate(cutFrame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Zoom during cut
  const zoom = interpolate(cutFrame, [0, FRAMES_PER_CUT], [0.88, 0.94], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Label
  const labelOpacity = interpolate(cutFrame, [15, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(cutFrame, [15, 30], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Cut fade out
  const cutFadeOut = cutFrame > FRAMES_PER_CUT - 15
    ? interpolate(cutFrame, [FRAMES_PER_CUT - 15, FRAMES_PER_CUT], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  // Overall fade
  const overallFade = interpolate(frame, [200, 240], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
        <MacbookFrame screenSrc={staticFile(cut.src)} />
      </div>

      {/* Label */}
      <div
        style={{
          position: "absolute",
          bottom: 55,
          left: "50%",
          transform: `translateX(-50%) translateY(${labelY}px)`,
          opacity: labelOpacity * cutFadeOut,
          fontFamily,
          fontSize: 18,
          fontWeight: 600,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "3px",
          textTransform: "uppercase",
          background: "rgba(16,185,129,0.08)",
          padding: "6px 22px",
          borderRadius: 8,
          border: "1px solid rgba(16,185,129,0.15)",
        }}
      >
        {cut.label}
      </div>
    </AbsoluteFill>
  );
};

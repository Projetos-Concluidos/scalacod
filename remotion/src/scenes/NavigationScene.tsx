import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile } from "remotion";
import { MacbookFrame } from "../components/MacbookFrame";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["600"], subsets: ["latin"] });

const pages = [
  { src: "images/pedidos.png", label: "Quadro de Pedidos" },
  { src: "images/leads.png", label: "Leads" },
  { src: "images/fluxos.png", label: "Fluxos WhatsApp" },
  { src: "images/conversas.png", label: "Conversas" },
  { src: "images/configuracoes.png", label: "Configurações" },
];

const FRAMES_PER_PAGE = 108; // ~1.8s per page

export const NavigationScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentPageIndex = Math.min(Math.floor(frame / FRAMES_PER_PAGE), pages.length - 1);
  const pageFrame = frame - currentPageIndex * FRAMES_PER_PAGE;
  const currentPage = pages[currentPageIndex];

  // Page transition
  const enterScale = spring({ frame: pageFrame, fps, config: { damping: 25, stiffness: 120 } });
  const scale = interpolate(enterScale, [0, 1], [0.92, 0.88]);
  const opacity = interpolate(pageFrame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Label animation
  const labelOpacity = interpolate(pageFrame, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelY = interpolate(pageFrame, [20, 40], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Page fade out before next
  const pageFadeOut = pageFrame > FRAMES_PER_PAGE - 20
    ? interpolate(pageFrame, [FRAMES_PER_PAGE - 20, FRAMES_PER_PAGE], [1, 0], { extrapolateRight: "clamp" })
    : 1;

  // Overall fade out at the end
  const overallFade = interpolate(frame, [500, 540], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          position: "absolute",
          width: 600,
          height: 300,
          background: "radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)",
          bottom: "10%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      <div
        style={{
          transform: `scale(${scale})`,
          opacity: opacity * pageFadeOut,
          transformOrigin: "center center",
        }}
      >
        <MacbookFrame screenSrc={staticFile(currentPage.src)} />
      </div>

      {/* Page label */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: `translateX(-50%) translateY(${labelY}px)`,
          opacity: labelOpacity * pageFadeOut,
          fontFamily,
          fontSize: 20,
          fontWeight: 600,
          color: "rgba(255,255,255,0.6)",
          letterSpacing: "3px",
          textTransform: "uppercase",
          background: "rgba(16,185,129,0.1)",
          padding: "8px 24px",
          borderRadius: 8,
          border: "1px solid rgba(16,185,129,0.2)",
        }}
      >
        {currentPage.label}
      </div>
    </AbsoluteFill>
  );
};

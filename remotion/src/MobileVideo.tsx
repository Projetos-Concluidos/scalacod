import { AbsoluteFill, Sequence } from "remotion";
import { MobileHookScene } from "./scenes/mobile/MobileHookScene";
import { MobileHomepageScene } from "./scenes/mobile/MobileHomepageScene";
import { MobileDashboardScene } from "./scenes/mobile/MobileDashboardScene";
import { MobilePedidosScene } from "./scenes/mobile/MobilePedidosScene";
import { MobileConversasScene } from "./scenes/mobile/MobileConversasScene";
import { MobileFluxosScene } from "./scenes/mobile/MobileFluxosScene";
import { MobileQuickCutsScene } from "./scenes/mobile/MobileQuickCutsScene";
import { MobileOutroScene } from "./scenes/mobile/MobileOutroScene";

/*
  STORYBOARD — 60s @ 60fps = 3600 frames (9:16 vertical)
  ─────────────────────────────────────────
  0s–4s     (0–240)       Hook / Abertura impactante
  4s–10s    (240–600)     Homepage
  10s–24s   (600–1440)    Dashboard (main + scroll)
  24s–34s   (1440–2040)   Pedidos / Kanban
  34s–42s   (2040–2520)   Conversas
  42s–50s   (2520–3000)   Fluxos WhatsApp
  50s–55s   (3000–3300)   Cortes rápidos
  55s–60s   (3300–3600)   CTA / Outro
*/

export const MobileVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#030712" }}>
      {/* Persistent ambient glow */}
      <MobilePersistentBackground />

      <Sequence from={0} durationInFrames={240}>
        <MobileHookScene />
      </Sequence>

      <Sequence from={240} durationInFrames={360}>
        <MobileHomepageScene />
      </Sequence>

      <Sequence from={600} durationInFrames={840}>
        <MobileDashboardScene />
      </Sequence>

      <Sequence from={1440} durationInFrames={600}>
        <MobilePedidosScene />
      </Sequence>

      <Sequence from={2040} durationInFrames={480}>
        <MobileConversasScene />
      </Sequence>

      <Sequence from={2520} durationInFrames={480}>
        <MobileFluxosScene />
      </Sequence>

      <Sequence from={3000} durationInFrames={300}>
        <MobileQuickCutsScene />
      </Sequence>

      <Sequence from={3300} durationInFrames={300}>
        <MobileOutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};

const MobilePersistentBackground: React.FC = () => {
  return (
    <AbsoluteFill style={{ zIndex: -1 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 60% at 50% 110%, rgba(16,185,129,0.04) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 40% at 50% -10%, rgba(16,185,129,0.03) 0%, transparent 60%)",
        }}
      />
    </AbsoluteFill>
  );
};

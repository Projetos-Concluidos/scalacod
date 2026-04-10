import { AbsoluteFill, Sequence } from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { HomepageScene } from "./scenes/HomepageScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { DashboardScrollScene } from "./scenes/DashboardScrollScene";
import { PedidosScene } from "./scenes/PedidosScene";
import { ConversasScene } from "./scenes/ConversasScene";
import { FluxosScene } from "./scenes/FluxosScene";
import { QuickCutsScene } from "./scenes/QuickCutsScene";
import { OutroScene } from "./scenes/OutroScene";

/*
  STORYBOARD — 60s @ 60fps = 3600 frames
  ─────────────────────────────────────────
  0s–5s     (0–300)      Intro cinemática
  5s–14s    (300–840)     Homepage / Landing
  14s–28s   (840–1680)    Dashboard principal + scroll
  28s–39s   (1680–2340)   Pedidos / Kanban
  39s–47s   (2340–2820)   Conversas
  47s–54s   (2820–3240)   Fluxos WhatsApp
  54s–58s   (3240–3480)   Cortes rápidos (checkouts, leads, config)
  58s–60s   (3480–3600)   Outro / CTA
*/

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#030712" }}>
      {/* Persistent ambient glow layer */}
      <PersistentBackground />

      <Sequence from={0} durationInFrames={300}>
        <IntroScene />
      </Sequence>

      <Sequence from={300} durationInFrames={540}>
        <HomepageScene />
      </Sequence>

      <Sequence from={840} durationInFrames={480}>
        <DashboardScene />
      </Sequence>

      <Sequence from={1320} durationInFrames={360}>
        <DashboardScrollScene />
      </Sequence>

      <Sequence from={1680} durationInFrames={660}>
        <PedidosScene />
      </Sequence>

      <Sequence from={2340} durationInFrames={480}>
        <ConversasScene />
      </Sequence>

      <Sequence from={2820} durationInFrames={420}>
        <FluxosScene />
      </Sequence>

      <Sequence from={3240} durationInFrames={240}>
        <QuickCutsScene />
      </Sequence>

      <Sequence from={3480} durationInFrames={120}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// Subtle ambient background that persists across scenes
const PersistentBackground: React.FC = () => {
  return (
    <AbsoluteFill style={{ zIndex: -1 }}>
      {/* Deep gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 120% 80% at 50% 120%, rgba(16,185,129,0.04) 0%, transparent 70%)",
        }}
      />
      {/* Top vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 100% 60% at 50% -20%, rgba(16,185,129,0.03) 0%, transparent 60%)",
        }}
      />
    </AbsoluteFill>
  );
};

import { AbsoluteFill, Sequence } from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { DashboardScene } from "./scenes/DashboardScene";
import { DashboardScrollScene } from "./scenes/DashboardScrollScene";
import { NavigationScene } from "./scenes/NavigationScene";
import { OutroScene } from "./scenes/OutroScene";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#030712" }}>
      {/* Scene 1: Intro — 0 to 240 (4s) */}
      <Sequence from={0} durationInFrames={240}>
        <IntroScene />
      </Sequence>

      {/* Scene 2: Dashboard main view — 240 to 840 (10s) */}
      <Sequence from={240} durationInFrames={600}>
        <DashboardScene />
      </Sequence>

      {/* Scene 3: Dashboard scroll — 840 to 1260 (7s) */}
      <Sequence from={840} durationInFrames={420}>
        <DashboardScrollScene />
      </Sequence>

      {/* Scene 4: Navigation through pages — 1260 to 1800 (9s) */}
      <Sequence from={1260} durationInFrames={540}>
        <NavigationScene />
      </Sequence>

      {/* Scene 5: Outro — 1800 to 2100 (5s) */}
      <Sequence from={1800} durationInFrames={300}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};

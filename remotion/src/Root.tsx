import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 60fps, ~35 seconds total
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={2100}
    fps={60}
    width={1920}
    height={1080}
  />
);

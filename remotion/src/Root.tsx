import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 60fps, 60 seconds = 3600 frames
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={3600}
    fps={60}
    width={1920}
    height={1080}
  />
);

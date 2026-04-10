import React from "react";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["600"], subsets: ["latin"] });

interface TextOverlayProps {
  text: string;
  opacity: number;
  position?: "bottom" | "top";
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ text, opacity, position = "bottom" }) => {
  if (opacity <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        [position]: 50,
        left: "50%",
        transform: "translateX(-50%)",
        opacity,
        fontFamily,
        fontSize: 18,
        fontWeight: 600,
        color: "rgba(255,255,255,0.5)",
        letterSpacing: "4px",
        textTransform: "uppercase",
        background: "rgba(16,185,129,0.06)",
        padding: "8px 28px",
        borderRadius: 10,
        border: "1px solid rgba(16,185,129,0.12)",
        zIndex: 50,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

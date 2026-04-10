import React from "react";
import { loadFont } from "@remotion/google-fonts/Sora";

const { fontFamily } = loadFont("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });

interface MobileTextOverlayProps {
  text: string;
  opacity: number;
  position?: "top" | "bottom" | "center";
  size?: "sm" | "md" | "lg" | "xl";
  accent?: boolean;
  y?: number;
}

export const MobileTextOverlay: React.FC<MobileTextOverlayProps> = ({
  text,
  opacity,
  position = "bottom",
  size = "md",
  accent = false,
  y = 0,
}) => {
  if (opacity <= 0) return null;

  const fontSize = { sm: 16, md: 22, lg: 32, xl: 44 }[size];
  const fontWeight = size === "xl" || size === "lg" ? 800 : 600;

  const posStyle: React.CSSProperties =
    position === "top"
      ? { top: 100 + y }
      : position === "center"
      ? { top: "50%", transform: `translateX(-50%) translateY(${-50 + y}%)` }
      : { bottom: 140 + y };

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        transform: position !== "center" ? `translateX(-50%) translateY(${y}px)` : undefined,
        opacity,
        fontFamily,
        fontSize,
        fontWeight,
        color: accent ? "#34D399" : "rgba(255,255,255,0.85)",
        letterSpacing: size === "sm" ? "4px" : "2px",
        textTransform: "uppercase",
        textAlign: "center",
        lineHeight: 1.3,
        maxWidth: "85%",
        textShadow: accent
          ? "0 0 30px rgba(52,211,153,0.4), 0 0 60px rgba(52,211,153,0.2)"
          : "0 2px 20px rgba(0,0,0,0.8)",
        zIndex: 50,
        whiteSpace: "pre-line",
        ...posStyle,
      }}
    >
      {text}
    </div>
  );
};

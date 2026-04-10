import React from "react";
import { Img } from "remotion";

interface IPhoneFrameProps {
  screenSrc: string;
  style?: React.CSSProperties;
  scrollPercent?: number;
  /** Zoom into a specific area of the screenshot. 1 = no zoom, 2 = 2x zoom */
  screenZoom?: number;
  /** Horizontal offset of the zoomed view (-1 to 1) */
  screenOffsetX?: number;
  /** Vertical offset of the zoomed view (-1 to 1) */
  screenOffsetY?: number;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({
  screenSrc,
  style,
  scrollPercent = 0,
  screenZoom = 1,
  screenOffsetX = 0,
  screenOffsetY = 0,
}) => {
  const phoneWidth = 380;
  const phoneHeight = 780;
  const screenWidth = phoneWidth - 20;
  const screenHeight = phoneHeight - 24;
  const borderRadius = 48;

  return (
    <div
      style={{
        position: "relative",
        width: phoneWidth,
        height: phoneHeight,
        ...style,
      }}
    >
      {/* Phone body */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, #1c1c1e 0%, #0a0a0c 100%)",
          borderRadius,
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      />

      {/* Side buttons */}
      {/* Volume up */}
      <div
        style={{
          position: "absolute",
          left: -3,
          top: 140,
          width: 3,
          height: 32,
          background: "#1c1c1e",
          borderRadius: "2px 0 0 2px",
        }}
      />
      {/* Volume down */}
      <div
        style={{
          position: "absolute",
          left: -3,
          top: 185,
          width: 3,
          height: 32,
          background: "#1c1c1e",
          borderRadius: "2px 0 0 2px",
        }}
      />
      {/* Power */}
      <div
        style={{
          position: "absolute",
          right: -3,
          top: 160,
          width: 3,
          height: 48,
          background: "#1c1c1e",
          borderRadius: "0 2px 2px 0",
        }}
      />

      {/* Screen area */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 10,
          width: screenWidth,
          height: screenHeight,
          borderRadius: borderRadius - 8,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {/* Screenshot content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
          }}
        >
          <Img
            src={screenSrc}
            style={{
              width: `${100 * screenZoom}%`,
              display: "block",
              position: "absolute",
              left: `${screenOffsetX * -50 * (screenZoom - 1)}%`,
              top: 0,
              transform: `translateY(-${scrollPercent * 3}px)`,
            }}
          />
        </div>

        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 34,
            borderRadius: 20,
            background: "#000",
            zIndex: 10,
          }}
        />

        {/* Screen glare */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.015) 100%)",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />
      </div>

      {/* Home indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: "50%",
          transform: "translateX(-50%)",
          width: 130,
          height: 4,
          borderRadius: 2,
          background: "rgba(255,255,255,0.3)",
        }}
      />
    </div>
  );
};

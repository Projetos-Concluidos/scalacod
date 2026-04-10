import React from "react";
import { Img, staticFile } from "remotion";

interface MacbookFrameProps {
  screenSrc: string;
  style?: React.CSSProperties;
}

export const MacbookFrame: React.FC<MacbookFrameProps> = ({ screenSrc, style }) => {
  return (
    <div
      style={{
        position: "relative",
        width: 1440,
        ...style,
      }}
    >
      {/* MacBook body */}
      <div
        style={{
          background: "linear-gradient(180deg, #2a2a2e 0%, #1a1a1e 100%)",
          borderRadius: 16,
          padding: "8px 8px 0 8px",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)",
        }}
      >
        {/* Camera notch */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingBottom: 6,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#1a1a1e",
              border: "1px solid #333",
            }}
          />
        </div>

        {/* Screen */}
        <div
          style={{
            borderRadius: "4px 4px 0 0",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Img
            src={screenSrc}
            style={{
              width: "100%",
              display: "block",
            }}
          />
          {/* Screen glare */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.015) 100%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* MacBook bottom hinge */}
      <div
        style={{
          height: 14,
          background: "linear-gradient(180deg, #2a2a2e 0%, #1e1e22 100%)",
          borderRadius: "0 0 4px 4px",
          margin: "0 60px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: "50%",
            transform: "translateX(-50%)",
            width: 80,
            height: 4,
            borderRadius: 2,
            background: "#333",
          }}
        />
      </div>

      {/* Bottom base */}
      <div
        style={{
          height: 6,
          background: "linear-gradient(180deg, #1e1e22 0%, #161618 100%)",
          borderRadius: "0 0 8px 8px",
          margin: "0 40px",
        }}
      />
    </div>
  );
};

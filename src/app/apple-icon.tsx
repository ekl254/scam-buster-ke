import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: "#16a34a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <svg
          width="100"
          height="110"
          viewBox="0 0 240 310"
          fill="none"
        >
          {/* Shield */}
          <path
            d="M120 0 L240 60 L240 180 C240 240 180 290 120 310 C60 290 0 240 0 180 L0 60 Z"
            fill="white"
            opacity="0.95"
          />
          {/* Checkmark */}
          <path
            d="M75 150 L105 180 L170 110"
            stroke="#16a34a"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span
          style={{
            color: "white",
            fontSize: 28,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: -1,
          }}
        >
          SB
        </span>
      </div>
    ),
    { ...size }
  );
}

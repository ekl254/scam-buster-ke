import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "#16a34a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="22"
          height="24"
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
      </div>
    ),
    { ...size }
  );
}

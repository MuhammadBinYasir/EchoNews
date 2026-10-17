import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "#f5f0e6",
          color: "#1a1917",
          fontFamily: "Georgia, serif",
          fontSize: 142,
          fontWeight: 700,
          letterSpacing: -12,
          borderRadius: 34,
        }}
      >
        E
        <div
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "#c0152f",
            right: 37,
            bottom: 39,
          }}
        />
      </div>
    ),
    size,
  );
}

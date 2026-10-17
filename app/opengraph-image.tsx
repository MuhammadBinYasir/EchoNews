import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Echo — the world, edited for you";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "58px 72px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          background: "#f5f0e6",
          color: "#1a1917",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 10,
            background: "#c0152f",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #ded7cb",
            paddingBottom: 18,
            fontFamily: "Arial, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#716c64",
          }}
        >
          <span>THE DAILY EDITION</span>
          <span>PERSONALIZED. THOUGHTFUL. YOURS.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 70, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 16 }}>
              <span style={{ fontSize: 88, lineHeight: 1, fontWeight: 700, letterSpacing: -7 }}>Echo</span>
              <span style={{ color: "#c0152f", fontSize: 88, lineHeight: 1, fontWeight: 700 }}>.</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 52, lineHeight: 1.08, letterSpacing: -1 }}>
              <span>The world,</span>
              <span>edited for you.</span>
            </div>
            <div
              style={{
                marginTop: 22,
                fontFamily: "Arial, sans-serif",
                fontSize: 21,
                lineHeight: 1.5,
                color: "#716c64",
              }}
            >
              A daily newspaper shaped around your curiosity.
            </div>
          </div>
          <div
            style={{
              width: 310,
              height: 295,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 14,
              padding: 24,
              boxSizing: "border-box",
              background: "#eee8dc",
              border: "1px solid #ded7cb",
              transform: "rotate(2deg)",
            }}
          >
            <span style={{ color: "#c0152f", fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>
              YOUR EDITION
            </span>
            <span style={{ fontSize: 28, lineHeight: 1.15 }}>Stories that matter. Room to discover.</span>
            <div style={{ width: "100%", height: 1, background: "#cfc6b8", marginTop: 4 }} />
            <span style={{ color: "#716c64", fontFamily: "Arial, sans-serif", fontSize: 14, letterSpacing: 1 }}>
              NEWS, EDITED WITH CARE
            </span>
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid #ded7cb",
            paddingTop: 14,
            color: "#716c64",
            fontFamily: "Arial, sans-serif",
            fontSize: 15,
            letterSpacing: 2,
          }}
        >
          ECHO · THE NEWS THAT SPEAKS TO YOU
        </div>
      </div>
    ),
    size,
  );
}

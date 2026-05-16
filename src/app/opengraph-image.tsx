import { ImageResponse } from "next/og";

export const alt = "Frier's Useful Pub Map — Find the best pubs in London";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Inline SVG of the cartoon logo
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 120" width="140" height="120">
  <g transform="translate(8, 36)">
    <path d="M 1 6 Q 3 1 5 3 Q 8 0 11 2 Q 14 1 16 6 Z" fill="#fdfaf3" stroke="#1a1a1a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M 1 6 L 16 6 L 14 28 Q 14 30 12 30 L 5 30 Q 3 30 3 28 Z" fill="#f0c060" stroke="#1a1a1a" stroke-width="2.2" stroke-linejoin="round"/>
  </g>
  <path d="M 56 18 L 60 8 L 65 16 L 70 6 L 75 16 L 80 8 L 84 18" fill="none" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 50 22 Q 44 30 45 42 Q 46 56 53 64 Q 65 72 80 68 Q 92 62 93 48 Q 94 32 86 24 Q 75 18 62 19 Q 54 20 50 22 Z" fill="none" stroke="#1a1a1a" stroke-width="2.8" stroke-linejoin="round"/>
  <ellipse cx="60" cy="38" rx="9" ry="10" fill="none" stroke="#1a1a1a" stroke-width="2.5"/>
  <circle cx="60" cy="40" r="2.5" fill="#1a1a1a"/>
  <ellipse cx="78" cy="38" rx="8" ry="9" fill="none" stroke="#1a1a1a" stroke-width="2.5"/>
  <circle cx="77" cy="40" r="2.2" fill="#1a1a1a"/>
  <path d="M 52 53 Q 70 70 87 53" fill="none" stroke="#1a1a1a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  <g stroke="#1a1a1a" stroke-width="2" stroke-linejoin="round" fill="none">
    <path d="M 55 54 L 55 61 L 60 62 L 60 55"/>
    <path d="M 60 55 L 60 62 L 65 63 L 65 55"/>
    <path d="M 65 55 L 65 63 L 70 64 L 70 55"/>
    <path d="M 70 55 L 70 64 L 75 63 L 75 55"/>
    <path d="M 75 55 L 75 63 L 80 62 L 80 55"/>
    <path d="M 80 55 L 80 62 L 84 60 L 84 54"/>
  </g>
  <g transform="translate(96, 40)" stroke="#1a1a1a" stroke-width="2.5" stroke-linejoin="round" fill="none">
    <path d="M 6 0 Q 4 -10 9 -11 Q 14 -10 12 0"/>
    <path d="M 0 0 Q 0 -2 3 -2 L 15 -2 Q 18 -2 18 3 L 18 14 Q 18 18 14 18 L 4 18 Q 0 18 0 14 Z"/>
    <path d="M 3 7 Q 9 9 16 7" stroke-linecap="round"/>
    <path d="M 4 18 L 4 24 L 14 24 L 14 18"/>
  </g>
</svg>`;

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f0e6",
          color: "#1f1d1a",
          fontFamily: "serif",
          padding: 80,
          gap: 24,
        }}
      >
        {/* Cartoon logo as inline SVG via data URI */}
        <img
          src={`data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`}
          alt=""
          width={280}
          height={240}
          style={{ display: "block" }}
        />

        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          Frier&rsquo;s Useful Pub Map
        </div>

        <div
          style={{
            fontSize: 30,
            color: "#5a544a",
            textAlign: "center",
            fontFamily: "sans-serif",
            letterSpacing: "-0.01em",
          }}
        >
          2,470 of London&rsquo;s pubs, filterable by what you actually care about
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            gap: 14,
            fontSize: 22,
            color: "#cc785c",
            fontWeight: 600,
            fontFamily: "sans-serif",
          }}
        >
          <span>Food</span>
          <span>·</span>
          <span>Sport</span>
          <span>·</span>
          <span>Beer Garden</span>
          <span>·</span>
          <span>Real Ale</span>
          <span>·</span>
          <span>Dogs OK</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

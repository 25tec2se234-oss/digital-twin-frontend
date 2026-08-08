import type { ReactElement } from "react";

/*
 * Stroke-based vector glyphs (24×24 design grid, lucide-grade geometry).
 * Rendered inside the wheel SVG so they stay razor-sharp at any DPI.
 */

type IconDef = {
  paths?: string[];
  circles?: Array<[number, number, number]>;
};

const ICONS: Record<string, IconDef> = {
  star: {
    paths: [
      "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
    ],
  },
  refresh: {
    paths: ["M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", "M8 16H3v5"],
  },
  /* Streak Saver — a protected flame */
  flame: {
    paths: [
      "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
    ],
  },
  /* Virtual Tour — an immersive headset */
  headset: {
    paths: [
      "M2 10.9A2.9 2.9 0 0 1 4.9 8h14.2A2.9 2.9 0 0 1 22 10.9v3.2a2.9 2.9 0 0 1-2.9 2.9h-3.02a2 2 0 0 1-1.664-.89l-.923-1.385a1.8 1.8 0 0 0-2.986 0l-.923 1.384A2 2 0 0 1 7.92 17H4.9A2.9 2.9 0 0 1 2 14.1z",
      "M6 8V6.6A2.6 2.6 0 0 1 8.6 4h6.8A2.6 2.6 0 0 1 18 6.6V8",
    ],
  },
  /* Extra Spin — one more turn of the wheel */
  extraspin: {
    paths: ["M21 12a9 9 0 1 1-3.4-7.04", "M21 3.2v5.2h-5.2", "M12 9.6v4.8", "M9.6 12h4.8"],
  },
  cap: {
    paths: [
      "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z",
      "M22 10v6",
      "M6 12.5V16a6 3 0 0 0 12 0v-3.5",
    ],
  },
  trophy: {
    paths: [
      "M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
      "M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
      "M4 22h16",
      "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",
      "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
      "M18 2H6v7a6 6 0 0 0 12 0V2Z",
    ],
  },
  sparkle: {
    paths: ["M12 2.5 14.1 9.9 21.5 12 14.1 14.1 12 21.5 9.9 14.1 2.5 12 9.9 9.9 Z", "M19 3.5v4", "M17 5.5h4"],
  },
};

export function SegmentIcon({
  name,
  size = 34,
  stroke = "#F2DD8F",
  strokeWidth = 1.6,
}: {
  name: string;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
}): ReactElement {
  const def = ICONS[name] ?? ICONS.star;
  return (
    <g
      transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 24})`}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {def.paths?.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {def.circles?.map(([cx, cy, r], i) => (
        <circle key={`c${i}`} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  );
}

/* The DTV monogram engraved into the ceramic core */
export function DtvMonogram({ className = "" }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 120 120" className={`monogram ${className}`} aria-label="DigitalTwin Verse">
      <defs>
        <linearGradient id="mono-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A6A1C" />
          <stop offset="0.35" stopColor="#F6E6A4" />
          <stop offset="0.62" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#9A7B22" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="none" stroke="url(#mono-gold)" strokeWidth="1.4" opacity="0.85" />
      <circle cx="60" cy="60" r="46.5" fill="none" stroke="url(#mono-gold)" strokeWidth="0.6" opacity="0.45" />
      {/* orbiting satellite node */}
      <circle cx="60" cy="8" r="2.4" fill="#F6E6A4" />
      <text
        x="60"
        y="63"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight="600"
        fontSize="34"
        letterSpacing="1"
        fill="url(#mono-gold)"
      >
        DTV
      </text>
      <text
        x="60"
        y="84"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Outfit', sans-serif"
        fontWeight="400"
        fontSize="7.2"
        letterSpacing="3.4"
        fill="#9AA7C4"
      >
        VERSE
      </text>
    </svg>
  );
}

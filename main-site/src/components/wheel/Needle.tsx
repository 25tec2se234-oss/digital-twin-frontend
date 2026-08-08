import { forwardRef, useImperativeHandle, useRef } from "react";

export interface NeedleHandle {
  /** A quick springy flex — fired every time a segment divider crosses the tip. */
  kick: (strength?: number) => void;
}

/**
 * The crystal pointer. It is mechanically fixed — it never travels around
 * the wheel; only the disc rotates beneath it. Its only motion is a subtle
 * flex reacting to each passing divider, growing calmer as the wheel slows
 * and delivering one final, satisfying click at rest.
 */
const Needle = forwardRef<NeedleHandle>(function Needle(_, ref) {
  const svgRef = useRef<SVGSVGElement>(null);

  useImperativeHandle(ref, () => ({
    kick(strength = 1) {
      const el = svgRef.current;
      if (!el) return;
      const flex = 12 * strength;
      el.animate(
        [
          { transform: "rotate(0deg) translateZ(0)" },
          { transform: `rotate(${flex}deg) translateZ(0)` },
          { transform: `rotate(${-flex * 0.2}deg) translateZ(0)` },
          { transform: "rotate(0deg) translateZ(0)" },
        ],
        { duration: 170, easing: "cubic-bezier(.3,1.6,.5,1)" }
      );
    },
  }));

  return (
    <div className="pointer-glow absolute left-1/2 top-[-4.8%] z-10 h-[19%] w-[10%] -translate-x-1/2">
      <svg ref={svgRef} viewBox="0 0 60 110" className="h-full w-full" style={{ transformOrigin: "50% 16%" }}>
        <defs>
          <linearGradient id="pHouse" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F6E6A4" />
            <stop offset="0.45" stopColor="#C9A53D" />
            <stop offset="1" stopColor="#6D5214" />
          </linearGradient>
          <linearGradient id="pCrystal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.4" stopColor="#BFD4FF" />
            <stop offset="1" stopColor="#2E6BFF" />
          </linearGradient>
        </defs>
        {/* gold housing */}
        <path
          d="M30 2 C42 2 50 10 50 22 L50 34 C50 40 46 44 42 48 L30 60 L18 48 C14 44 10 40 10 34 L10 22 C10 10 18 2 30 2 Z"
          fill="url(#pHouse)"
          stroke="#3A2C08"
          strokeWidth="1.4"
        />
        <path
          d="M30 6 C39 6 46 12 46 22 L46 30 C46 35 43 39 39 42 L30 50 L21 42 C17 39 14 35 14 30 L14 22 C14 12 21 6 30 6 Z"
          fill="none"
          stroke="rgba(255,250,220,0.5)"
          strokeWidth="0.8"
        />
        {/* diamond crystal tip — the exact point of truth */}
        <path d="M30 44 L42 62 L30 104 L18 62 Z" fill="url(#pCrystal)" stroke="rgba(255,255,255,0.75)" strokeWidth="1" />
        <path className="crystal-shimmer" d="M30 44 L42 62 L30 70 L18 62 Z" fill="rgba(255,255,255,0.55)" />
        <path d="M30 70 L30 104" stroke="rgba(255,255,255,0.65)" strokeWidth="0.8" />
        <circle cx="30" cy="22" r="4.5" fill="#0B0E14" stroke="rgba(246,230,164,0.8)" strokeWidth="1" />
        <circle cx="30" cy="22" r="1.8" fill="#F6E6A4" />
      </svg>
    </div>
  );
});

export default Needle;

import { SegmentIcon, DtvMonogram } from "./icons";
import {
  REWARDS,
  VIEWBOX,
  CENTER,
  OUTER_RADIUS,
  DIVIDER_INNER_RADIUS,
  segmentPath,
  segmentBounds,
  annulusPath,
  polar,
  fitFontSize,
  type Tier,
} from "./rewards";

type Phase = "idle" | "charging" | "spinning" | "landed";

const winGlowFill = (id: string, tier: Tier | null) => {
  if (id === "mentor1w") return "rgba(246,230,164,0.62)";
  if (tier === "common") return "rgba(150,180,255,0.3)";
  return "rgba(180,205,255,0.45)";
};

export default function WheelDial({
  discRef,
  streakRef,
  phase,
  revealStep,
  winningIndex,
  tier,
  pulseKey,
  onSpin,
  disabled,
}: {
  discRef: React.RefObject<HTMLDivElement>;
  streakRef: React.RefObject<HTMLDivElement>;
  phase: Phase;
  revealStep: number;
  winningIndex: number | null;
  tier: Tier | null;
  pulseKey: number;
  onSpin: () => void;
  disabled?: boolean;
}) {
  const landed = phase === "landed";
  const rareIcon = winningIndex != null ? REWARDS[winningIndex].icon : "trophy";

  return (
    <>
      {/* breathing aura behind the whole instrument */}
      <div className="aura absolute -inset-[12%] rounded-full" aria-hidden="true" />

      {/* brushed gold housing */}
      <div className="gold-ring-edge absolute inset-0 rounded-full">
        <div className="gold-ring absolute inset-0 rounded-full" />
        <div className="ring-grooves absolute inset-0 rounded-full" />
        <div className="ring-sweep absolute inset-0 rounded-full" />
      </div>

      {/* rotating sapphire disc — equal, symmetrical, mathematically precise segments */}
      <div ref={discRef} className="absolute inset-[8.34%] will-change-transform" style={{ transform: "rotate(0deg)" }}>
        <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-full w-full">
          <defs>
            <radialGradient id="gNavyA" gradientUnits="userSpaceOnUse" cx={CENTER} cy={CENTER} r={OUTER_RADIUS}>
              <stop offset="0.28" stopColor="#0A142E" />
              <stop offset="0.75" stopColor="#12234D" />
              <stop offset="1" stopColor="#0B1838" />
            </radialGradient>
            <radialGradient id="gNavyB" gradientUnits="userSpaceOnUse" cx={CENTER} cy={CENTER} r={OUTER_RADIUS}>
              <stop offset="0.28" stopColor="#081026" />
              <stop offset="0.75" stopColor="#0E1C3F" />
              <stop offset="1" stopColor="#091430" />
            </radialGradient>
            <radialGradient id="gNavyC" gradientUnits="userSpaceOnUse" cx={CENTER} cy={CENTER} r={OUTER_RADIUS}>
              <stop offset="0.28" stopColor="#0B1230" />
              <stop offset="0.75" stopColor="#152A52" />
              <stop offset="1" stopColor="#0C1A3B" />
            </radialGradient>
            <radialGradient id="gGold" gradientUnits="userSpaceOnUse" cx={CENTER} cy={CENTER} r={OUTER_RADIUS}>
              <stop offset="0.3" stopColor="#171104" />
              <stop offset="0.78" stopColor="#3A2D0C" />
              <stop offset="1" stopColor="#2A2008" />
            </radialGradient>
            <linearGradient id="divGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F6E6A4" />
              <stop offset="0.5" stopColor="#B8860B" />
              <stop offset="1" stopColor="#6D5214" />
            </linearGradient>
          </defs>

          {/* segment faces — identical geometry, one premium gradient each */}
          {REWARDS.map((r, i) => (
            <path key={r.id} d={segmentPath(i)} fill={`url(#${r.gradientId})`} stroke="#05070B" strokeWidth="1" />
          ))}

          {/* post-stop confirmation: golden glow & border stroke drawn STRICTLY inside segment `winningIndex` */}
          {landed && winningIndex != null && revealStep >= 1 && (() => {
            const { start, end } = segmentBounds(winningIndex);
            return (
              <g key={`win-segment-${pulseKey}`}>
                <path
                  d={annulusPath(start + 0.5, end - 0.5, DIVIDER_INNER_RADIUS + 1, OUTER_RADIUS - 2)}
                  fill={winGlowFill(REWARDS[winningIndex].id, tier)}
                  className="win-glow"
                />
                <path
                  d={annulusPath(start + 0.5, end - 0.5, DIVIDER_INNER_RADIUS + 1, OUTER_RADIUS - 2)}
                  fill="none"
                  stroke="rgba(246,230,164,0.95)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  className="win-outline"
                />
              </g>
            );
          })()}

          {/* dim veil on all OTHER segments (i !== winningIndex) — strictly covers every non-winning segment */}
          {landed && winningIndex != null && (
            <g className={`dim-veil ${revealStep >= 1 ? "on" : ""}`}>
              {REWARDS.map((r, i) => (
                i !== winningIndex && (
                  <path key={`dim-${r.id}`} d={segmentPath(i)} fill="rgba(3,5,9,0.68)" />
                )
              ))}
            </g>
          )}

          {/* concentric polish marks — brushed metal realism */}
          <circle cx={CENTER} cy={CENTER} r={172} fill="none" stroke="rgba(150,170,220,0.05)" strokeWidth="1" />
          <circle cx={CENTER} cy={CENTER} r={216} fill="none" stroke="rgba(150,170,220,0.045)" strokeWidth="1" />
          <circle cx={CENTER} cy={CENTER} r={258} fill="none" stroke="rgba(150,170,220,0.05)" strokeWidth="1" />

          {/* brushed-gold machined dividers — perfectly symmetrical, equal spacing */}
          {REWARDS.map((_, i) => {
            const { start } = segmentBounds(i);
            const [x0, y0] = polar(DIVIDER_INNER_RADIUS, start);
            const [x1, y1] = polar(OUTER_RADIUS - 1, start);
            return (
              <g key={`d${i}`}>
                <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#04060A" strokeWidth="5" strokeLinecap="round" />
                <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="url(#divGold)" strokeWidth="1.6" strokeLinecap="round" />
              </g>
            );
          })}

          {/* labels — center-aligned, auto-fit, icon + title + optional subtitle */}
          {REWARDS.map((r, i) => {
            const { center } = segmentBounds(i);
            const norm = ((center % 360) + 360) % 360;
            const flip = norm > 90 && norm < 270;
            const labelRotation = center + 90;
            const labelFill = r.variant === "gold" ? "#F6E6A4" : "#E9EDF5";
            const subFill = r.variant === "gold" ? "#C9A53D" : "#8FA0C4";
            const titleSize = r.subtitle ? fitFontSize(r.title, 15, 10) : fitFontSize(r.title, 22, 10);
            const subSize = r.subtitle ? fitFontSize(r.subtitle, 11, 11) : 0;
            return (
              <g key={`l${r.id}`} transform={`rotate(${labelRotation} ${CENTER} ${CENTER})`}>
                {/* block optically centered on the segment's radial midline, with airy spacing */}
                <g transform={`translate(${CENTER} ${CENTER - 218})${flip ? " rotate(180)" : ""}`}>
                  <g transform="translate(0 -36)">
                    <SegmentIcon name={r.icon} size={30} stroke={r.iconColor} strokeWidth={1.5} />
                  </g>
                  {r.subtitle ? (
                    <>
                      <text y="6" textAnchor="middle" dominantBaseline="middle" fontFamily="'Outfit', sans-serif" fontWeight="500" fontSize={titleSize} letterSpacing="2.2" fill={labelFill}>
                        {r.title}
                      </text>
                      <text y="28" textAnchor="middle" dominantBaseline="middle" fontFamily="'Outfit', sans-serif" fontWeight="400" fontSize={subSize} letterSpacing="2.8" fill={subFill}>
                        {r.subtitle}
                      </text>
                    </>
                  ) : (
                    <text y="14" textAnchor="middle" dominantBaseline="middle" fontFamily="'Outfit', sans-serif" fontWeight="600" fontSize={titleSize} letterSpacing="2.6" fill={labelFill}>
                      {r.title}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* beam of golden light traveling from the winning segment into the core — ends before the core button */}
      {landed && revealStep >= 2 && (
        <div className="pointer-events-none absolute inset-[8.34%]" aria-hidden="true">
          <div
            className="beam absolute left-1/2 top-[1.5%] h-[27%] w-[10px] -translate-x-1/2 rounded-full"
            style={{ background: "linear-gradient(to bottom, rgba(246,230,164,0.1), rgba(246,230,164,0.75) 55%, rgba(255,251,233,0.95))", filter: "blur(3px)" }}
          />
          <div
            className="beam absolute left-1/2 top-[1.5%] h-[27%] w-[2.5px] -translate-x-1/2 rounded-full"
            style={{ background: "linear-gradient(to bottom, rgba(255,251,233,0), #FFFBE9 70%)", boxShadow: "0 0 12px rgba(246,230,164,0.9)" }}
          />
          <div
            className="beam-spark absolute left-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "radial-gradient(circle, #FFFBE9 0%, rgba(246,230,164,0.8) 40%, transparent 70%)", boxShadow: "0 0 18px 4px rgba(246,230,164,0.8)" }}
          />
        </div>
      )}

      {/* velocity streaks — motion-blur illusion during high-speed rotation */}
      <div ref={streakRef} className="streaks pointer-events-none absolute inset-[8.34%] rounded-full" aria-hidden="true" />

      {/* fixed crystal sheen + cursor-reactive specular light */}
      <div className="crystal-sheen pointer-events-none absolute inset-[8.34%] rounded-full" aria-hidden="true" />
      <div className="cursor-light pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" />

      {/* inner smoked-glass ring + machined hardware */}
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="screw" cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#F6E6A4" />
            <stop offset="0.5" stopColor="#8A6A1C" />
            <stop offset="1" stopColor="#3A2C08" />
          </radialGradient>
        </defs>
        <circle cx={CENTER} cy={CENTER} r={299} fill="none" stroke="rgba(246,230,164,0.28)" strokeWidth="1.4" />
        <circle cx={CENTER} cy={CENTER} r={126} fill="none" stroke="#04060A" strokeWidth="20" opacity="0.92" />
        <circle cx={CENTER} cy={CENTER} r={136.5} fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth="1.2" />
        <circle cx={CENTER} cy={CENTER} r={115.5} fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
        {Array.from({ length: 72 }).map((_, i) => {
          const major = i % 8 === 0;
          const a = (i * 5 * Math.PI) / 180;
          const r0 = major ? 306 : 310;
          const r1 = major ? 330 : 322;
          return (
            <line
              key={i}
              x1={CENTER + r0 * Math.cos(a)}
              y1={CENTER + r0 * Math.sin(a)}
              x2={CENTER + r1 * Math.cos(a)}
              y2={CENTER + r1 * Math.sin(a)}
              stroke={major ? "rgba(20,15,4,0.85)" : "rgba(20,15,4,0.5)"}
              strokeWidth={major ? 2.4 : 1.1}
            />
          );
        })}
        {Array.from({ length: 72 }).map((_, i) => {
          const major = i % 8 === 0;
          const a = (i * 5 * Math.PI) / 180;
          const r0 = major ? 307 : 311;
          const r1 = major ? 329 : 321;
          return (
            <line
              key={`h${i}`}
              x1={CENTER + r0 * Math.cos(a)}
              y1={CENTER + r0 * Math.sin(a)}
              x2={CENTER + r1 * Math.cos(a)}
              y2={CENTER + r1 * Math.sin(a)}
              stroke={major ? "rgba(246,230,164,0.75)" : "rgba(246,230,164,0.28)"}
              strokeWidth={major ? 1.1 : 0.6}
            />
          );
        })}
        {[45, 135, 225, 315].map((a) => {
          const [sx, sy] = polar(336, a);
          return (
            <g key={a}>
              <circle cx={sx} cy={sy} r={5.2} fill="url(#screw)" stroke="#241B06" strokeWidth="1" />
              <line x1={sx - 2.6} y1={sy} x2={sx + 2.6} y2={sy} stroke="#241B06" strokeWidth="1.1" transform={`rotate(${a} ${sx} ${sy})`} />
            </g>
          );
        })}
      </svg>

      {/* energy gathering sweep during charge */}
      {phase === "charging" && <div className="charge-sweep pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" />}
      {(phase === "charging" || phase === "spinning") && (
        <div key={pulseKey} className="pulse-ring pointer-events-none absolute inset-[30%] rounded-full" aria-hidden="true" />
      )}

      {/* golden ripples as the core awakens */}
      {landed && revealStep >= 3 && (
        <>
          <div key={`r1${pulseKey}`} className="ripple-ring pointer-events-none absolute inset-[30%] rounded-full" aria-hidden="true" />
          <div key={`r2${pulseKey}`} className="ripple-ring pointer-events-none absolute inset-[30%] rounded-full" style={{ animationDelay: "160ms" }} aria-hidden="true" />
        </>
      )}

      {/* ceramic core — DTV logo perfectly centered, the mechanical heart of the instrument */}
      <button
        type="button"
        onClick={onSpin}
        disabled={disabled}
        aria-label={disabled ? "Daily spin limit reached" : "Spin the wheel"}
        className={`hub absolute inset-[35%] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#F2DD8F]/70 ${
          disabled ? "cursor-not-allowed opacity-50 grayscale" : "cursor-pointer"
        }`}
      >
        <div className="hub-spec absolute inset-0" aria-hidden="true" />
        <div
          className={`hub-pulse absolute inset-[8%] rounded-full ${phase === "charging" || phase === "spinning" ? "!opacity-100" : ""}`}
          style={{ boxShadow: "inset 0 0 26px rgba(46,107,255,0.25), 0 0 30px rgba(212,175,55,0.18)" }}
          aria-hidden="true"
        />
        {landed && revealStep >= 3 && tier !== "common" && <div className="hub-flash pointer-events-none absolute inset-[2%] rounded-full" aria-hidden="true" />}
        <DtvMonogram className={`absolute inset-[16%] ${landed && revealStep >= 3 ? "monogram-awake" : ""}`} />
      </button>

      {/* the winning reward's own emblem rising from the core on a rare alignment */}
      {landed && revealStep >= 4 && tier === "rare" && (
        <div key={`tr${pulseKey}`} className="trophy-rise pointer-events-none absolute left-1/2 top-1/2 z-20" aria-hidden="true">
          <svg viewBox="-14 -14 28 28" className="h-20 w-20">
            <SegmentIcon name={rareIcon} size={26} stroke="#F6E6A4" strokeWidth={1.25} />
          </svg>
        </div>
      )}
    </>
  );
}

import { SegmentIcon } from "./icons";
import { grantsAnotherSpin, type Reward, type Tier } from "./rewards";

export default function RewardCard({
  reward,
  tier,
  motivation,
  pulseKey,
  claimCode,
  remainingSpins,
  onSpinAgain,
  onClose,
}: {
  reward: Reward;
  tier: Tier;
  motivation: string;
  pulseKey: number;
  claimCode?: string;
  remainingSpins: number;
  onSpinAgain: () => void;
  onClose: () => void;
}) {
  const isCommon = tier === "common";
  const isRare = tier === "rare";
  const anotherSpin = grantsAnotherSpin(reward);
  const eyebrow = isRare
    ? "A rare alignment · Congratulations"
    : anotherSpin
      ? "Bonus Turn Earned"
      : isCommon
        ? "The journey continues"
        : "Reward Unlocked";
  const badgeStroke = isCommon ? "#BFD4FF" : "#F6E6A4";
  const iconStroke = isRare ? "#F6E6A4" : isCommon ? "#BFD4FF" : "#C7D4F2";

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      {/* premium light connecting the needle to the reward card */}
      <div className="link-beam pointer-events-none absolute left-1/2 top-[11.5%] h-[21%] w-[2px] -translate-x-1/2" aria-hidden="true" />
      <div className="card-glow pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full" aria-hidden="true" />

      <div key={`c${pulseKey}`} className={`reward-card pointer-events-auto ${isRare ? "is-rare" : anotherSpin ? "is-spin" : isCommon ? "is-common" : ""} px-7 py-7 text-center sm:px-9 max-w-md w-[90%]`}>
        <div className="card-sheen pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <div className="mb-3 flex items-center justify-center gap-2.5">
            <svg viewBox="-12 -12 24 24" className="h-4 w-4" aria-hidden="true">
              <SegmentIcon name={isCommon ? "sparkle" : "trophy"} size={20} stroke={badgeStroke} strokeWidth={1.5} />
            </svg>
            <p className="font-body text-[10px] font-medium uppercase tracking-[0.42em] text-[#C9A53D]">{eyebrow}</p>
            <svg viewBox="-12 -12 24 24" className="h-4 w-4" aria-hidden="true">
              <SegmentIcon name={isCommon ? "sparkle" : "trophy"} size={20} stroke={badgeStroke} strokeWidth={1.5} />
            </svg>
          </div>

          <div className="mb-4 flex items-center justify-center">
            <div className="icon-disc flex h-14 w-14 items-center justify-center rounded-full">
              <svg viewBox="-12 -12 24 24" className="h-7 w-7" aria-hidden="true">
                <SegmentIcon name={reward.icon} size={26} stroke={iconStroke} strokeWidth={1.5} />
              </svg>
            </div>
          </div>

          <p className="mb-1 font-body text-[10px] font-light uppercase tracking-[0.3em] text-[#8FA0C4]">
            {anotherSpin ? "The needle granted you" : "The needle landed on"}
          </p>
          <h2 className={`${isRare ? "gold-text-bright" : "gold-text"} font-display text-[32px] font-semibold italic leading-tight [text-wrap:balance] sm:text-[38px]`}>{reward.label}</h2>

          <p className="mx-auto mt-3 max-w-[300px] font-body text-[12.5px] font-light leading-relaxed tracking-wide text-[#AEBBD8]">{reward.description}</p>

          {claimCode && (
            <div className="mt-4 p-3 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.4)]">
              <p className="text-[10px] font-mono uppercase text-[#C9A53D] tracking-widest mb-1">Your Mentorship Claim Code</p>
              <p className="text-base font-bold font-mono text-[#F6E6A4] tracking-wider select-all">{claimCode}</p>
            </div>
          )}

          <div className="mx-auto my-4 h-px w-24" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.55), transparent)" }} />

          <p className="font-display text-[14px] font-medium italic leading-snug text-[#D7E0F4]">{motivation}</p>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            {anotherSpin && remainingSpins > 0 ? (
              <button
                type="button"
                onClick={onSpinAgain}
                className="spin-again pointer-events-auto w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(212,175,55,0.4)] bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-[rgba(246,230,164,0.3)] px-6 py-2.5 font-body text-[11px] font-bold uppercase tracking-[0.25em] text-[#F6E6A4] shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Use Extra Spin ({remainingSpins} Available)
              </button>
            ) : reward.id === "tour" ? (
              <a
                href="/"
                className="pointer-events-auto w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37] bg-[#d4af37] px-6 py-2.5 font-body text-[11px] font-bold uppercase tracking-[0.2em] text-black shadow-lg hover:opacity-90 no-underline"
              >
                🚀 Launch Virtual Tour
              </a>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="pointer-events-auto w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(212,175,55,0.35)] px-6 py-2.5 font-body text-[11px] font-medium uppercase tracking-[0.25em] text-[#C9A53D] hover:bg-[rgba(212,175,55,0.15)] transition-colors"
              >
                {isCommon ? "Return Tomorrow" : "Claim & Close"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

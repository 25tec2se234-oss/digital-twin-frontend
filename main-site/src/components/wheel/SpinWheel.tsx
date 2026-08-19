import React, { useCallback, useEffect, useRef, useState } from "react";
import Particles from "./Particles";
import Celebration, { type CelebrationMode } from "./Celebration";
import WheelDial from "./WheelDial";
import Needle, { type NeedleHandle } from "./Needle";
import RewardCard from "./RewardCard";
import { audio } from "./audio";
import { randomSpinPlan } from "./easing";
import {
  REWARDS,
  MOTIVATIONS,
  tierOf,
  pickWeightedIndex,
  rotationDeltaForIndex,
  segmentIndexAtRotation,
  type Reward,
  type Tier,
} from "./rewards";
import { checkUserLoggedIn } from "../../utils/auth";
import {
  getWheelState,
  getRemainingSpins,
  consumeSpin,
  recordWin,
  getTimeUntilMidnight,
  syncWheelStateWithBackend,
  requestBackendSpin,
  type WheelState,
} from "./wheelState";
import "./wheel.css";

type Phase = "idle" | "charging" | "spinning" | "landed";

const REVEAL_TIMING = { glow: 0, beam: 900, awaken: 1500, card: 2250 };

export default function SpinWheel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const magnetRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<NeedleHandle>(null);

  const energyRef = useRef(0);
  const hoverRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const rotationRef = useRef(0);
  const spinningRef = useRef(false);
  const rafRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [revealStep, setRevealStep] = useState(0);
  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [result, setResult] = useState<Reward | null>(null);
  const [motivation, setMotivation] = useState(MOTIVATIONS[0]);
  const [pulseKey, setPulseKey] = useState(0);
  const [claimCode, setClaimCode] = useState<string | undefined>(undefined);

  // Wheel state persistence & daily limit
  const [wheelState, setWheelState] = useState<WheelState>(() => getWheelState());
  const [countdown, setCountdown] = useState(() => getTimeUntilMidnight().formatted);

  const remainingSpins = getRemainingSpins(wheelState);
  const isLocked = remainingSpins <= 0;

  const tier: Tier | null = result ? tierOf(result) : null;
  const celebMode: CelebrationMode = phase === "landed" && revealStep >= 4 ? tier : null;

  // Live countdown timer & backend state sync
  useEffect(() => {
    syncWheelStateWithBackend().then((latest) => {
      setWheelState(latest);
    });
    const interval = setInterval(() => {
      setCountdown(getTimeUntilMidnight().formatted);
      setWheelState(getWheelState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    cancelAnimationFrame(rafRef.current);
    spinningRef.current = false;
    setPhase("idle");
    setResult(null);
    setWinningIndex(null);
    setRevealStep(0);
    setClaimCode(undefined);
    setWheelState(getWheelState());
    if (cameraRef.current) cameraRef.current.style.transform = "scale(1)";
  }, [clearTimers]);

  const spin = useCallback(() => {
    if (spinningRef.current) return;
    if (!checkUserLoggedIn()) {
      window.location.href = "/login.html?redirect=/wheel";
      return;
    }

    const currentWheelState = getWheelState();
    const availableSpins = getRemainingSpins(currentWheelState);

    if (availableSpins <= 0) {
      alert("You have used your daily spin! Please return tomorrow for your next spin.");
      return;
    }

    // Consume 1 spin immediately
    const updatedState = consumeSpin(currentWheelState);
    setWheelState(updatedState);

    spinningRef.current = true;
    audio.ensure();
    audio.charge();
    clearTimers();
    setResult(null);
    setWinningIndex(null);
    setRevealStep(0);
    setClaimCode(undefined);
    setPhase("charging");
    setPulseKey((k) => k + 1);
    if (cameraRef.current) cameraRef.current.style.transform = "scale(1)";

    requestBackendSpin().then((backendRes) => {
      if (backendRes.error === "DailySpinLimitReached") {
        console.warn("Backend daily spin limit enforced.");
      }
    });

    const chosenIndex = pickWeightedIndex();
    const current = rotationRef.current;
    const { delta } = rotationDeltaForIndex(chosenIndex, current);
    const plan = randomSpinPlan();

    window.setTimeout(() => {
      setPhase("spinning");
      const t0 = performance.now();
      const SEG_ANGLE = 360 / REWARDS.length;
      let prevTickIdx = Math.floor((((current % 360) + 360) % 360) / SEG_ANGLE);
      let prevEased = 0;
      let prevT = t0;

      const frame = (now: number) => {
        const p = Math.min(1, (now - t0) / plan.durationMs);
        const eased = plan.ease(p);
        const rot = current + delta * eased;
        const dt = Math.max(14, now - prevT);
        const vel = ((eased - prevEased) * delta * 1000) / dt;
        prevEased = eased;
        prevT = now;

        rotationRef.current = rot;
        if (discRef.current) discRef.current.style.transform = `rotate(${rot}deg) translateZ(0)`;

        const energy = Math.min(1, Math.abs(vel) / 950);
        energyRef.current = energy;
        if (streakRef.current) streakRef.current.style.opacity = (energy * 0.88).toFixed(3);
        if (cameraRef.current) cameraRef.current.style.transform = `scale(${(1 + energy * 0.022).toFixed(4)}) translateZ(0)`;

        const norm = ((rot % 360) + 360) % 360;
        const tickIdx = Math.floor(norm / SEG_ANGLE);
        if (tickIdx !== prevTickIdx) {
          prevTickIdx = tickIdx;
          needleRef.current?.kick(Math.min(1, 0.4 + energy));
          audio.tick(Math.min(1, Math.abs(vel) / 720));
        }

        if (p < 1) {
          rafRef.current = requestAnimationFrame(frame);
          return;
        }

        const lockedAngle = current + delta;
        rotationRef.current = lockedAngle;
        if (discRef.current) discRef.current.style.transform = `rotate(${lockedAngle}deg) translateZ(0)`;

        const bDur = 480 + Math.random() * 160;
        const b0 = performance.now();
        const bounce = (now2: number) => {
          const q = Math.min(1, (now2 - b0) / bDur);
          const overshoot = Math.sin(q * Math.PI * 1.6) * 0.7 * (1 - q);
          const rot2 = lockedAngle + overshoot;
          rotationRef.current = rot2;
          if (discRef.current) discRef.current.style.transform = `rotate(${rot2}deg) translateZ(0)`;
          energyRef.current = (1 - q) * 0.06;
          if (q < 1) {
            rafRef.current = requestAnimationFrame(bounce);
            return;
          }

          rotationRef.current = lockedAngle;
          if (discRef.current) discRef.current.style.transform = `rotate(${lockedAngle}deg) translateZ(0)`;
          energyRef.current = 0;
          if (streakRef.current) streakRef.current.style.opacity = "0";
          if (cameraRef.current) {
            cameraRef.current.style.transform = "scale(1) translateZ(0)";
            cameraRef.current.animate([{ transform: "scale(1.025) translateZ(0)" }, { transform: "scale(1) translateZ(0)" }], {
              duration: 1000,
              easing: "cubic-bezier(.16,1,.3,1)",
            });
          }

          needleRef.current?.kick(1.4);
          audio.tick(0.75);
          spinningRef.current = false;

          const confirmedIndex = segmentIndexAtRotation(lockedAngle);
          const confirmed = REWARDS[confirmedIndex];

          // Persist Win & Update State
          const { newState: latestState, claimCode: generatedCode } = recordWin(confirmed.id, confirmed.label);
          setWheelState(latestState);
          setClaimCode(generatedCode);

          setWinningIndex(confirmedIndex);
          setResult(confirmed);
          setMotivation(MOTIVATIONS[(Math.random() * MOTIVATIONS.length) | 0]);
          setPhase("landed");
          setRevealStep(1);

          const t = tierOf(confirmed);
          timersRef.current.push(
            window.setTimeout(() => {
              setRevealStep(2);
              audio.beam();
            }, REVEAL_TIMING.beam),
            window.setTimeout(() => {
              setRevealStep(3);
              audio.awaken(t === "rare");
            }, REVEAL_TIMING.awaken),
            window.setTimeout(() => {
              setRevealStep(4);
              if (t === "rare") audio.jackpot();
              else if (t === "medium") audio.victory();
              else audio.luck();
            }, REVEAL_TIMING.card)
          );
        };
        rafRef.current = requestAnimationFrame(bounce);
      };
      rafRef.current = requestAnimationFrame(frame);
    }, 340);
  }, [clearTimers]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      clearTimers();
    },
    [clearTimers]
  );

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const root = rootRef.current;
    const mag = magnetRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    root.style.setProperty("--lx", `${50 + nx * 90}%`);
    root.style.setProperty("--ly", `${50 + ny * 90}%`);
    if (mag && !spinningRef.current) {
      mag.style.transform = `translate(${(nx * 10).toFixed(1)}px, ${(ny * 8).toFixed(1)}px) translateZ(0)`;
    }
  }, []);

  const onEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    hoverRef.current = true;
  }, []);

  const onLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    hoverRef.current = false;
    if (magnetRef.current) magnetRef.current.style.transform = "translate(0px, 0px) translateZ(0)";
  }, []);

  const landed = phase === "landed";

  return (
    <div className="dtv-wheel-container stage-bg relative h-full w-full min-h-[680px] overflow-hidden">
      {/* soft god rays radiating behind the instrument */}
      <div className="god-rays pointer-events-none absolute left-1/2 top-1/2 h-[150vmin] w-[150vmin] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
      {/* cinematic vignette */}
      <div className="vignette pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* Floating Status Pill Header */}
      <div className="absolute top-5 right-5 z-50">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(11,14,20,0.85)] backdrop-blur-md font-body text-xs font-medium uppercase tracking-[0.2em] text-[#F6E6A4] shadow-lg">
          {remainingSpins > 0 ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>⚡ {remainingSpins} Daily Spin Available</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>🔒 Next Spin In: {countdown}</span>
            </>
          )}
        </div>
      </div>

      <div
        ref={rootRef}
        className="relative flex h-full w-full min-h-[650px] flex-col items-center justify-center py-8"
        onPointerMove={onMove}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
      >
        <Particles energyRef={energyRef} hoverRef={hoverRef} />

        {/* camera zoom layer */}
        <div ref={cameraRef} className="relative will-change-transform">
          {/* magnetic drift layer */}
          <div ref={magnetRef} className="relative transition-transform duration-500 ease-out will-change-transform">
            {/* floating layer */}
            <div className="wheel-float group/wheel relative">
              <div className="wheel-lift relative aspect-square w-[clamp(280px,88vw,620px)]">
                {/* celebration light layers */}
                {landed && revealStep >= 3 && tier !== "common" && <div className="win-rays pointer-events-none absolute -inset-[55%]" aria-hidden="true" />}
                {landed && revealStep >= 3 && tier === "rare" && <div className="jackpot-beams pointer-events-none absolute -inset-[48%]" aria-hidden="true" />}
                {landed && revealStep >= 3 && tier === "rare" && <div className="jackpot-halo pointer-events-none absolute -inset-[14%]" aria-hidden="true" />}

                <WheelDial
                  discRef={discRef}
                  streakRef={streakRef}
                  phase={phase}
                  revealStep={revealStep}
                  winningIndex={winningIndex}
                  tier={tier}
                  pulseKey={pulseKey}
                  onSpin={spin}
                  disabled={isLocked}
                />

                <Needle ref={needleRef} />

                {landed && revealStep >= 4 && result && tier && (
                  <RewardCard
                    reward={result}
                    tier={tier}
                    motivation={motivation}
                    pulseKey={pulseKey}
                    claimCode={claimCode}
                    remainingSpins={remainingSpins}
                    onSpinAgain={reset}
                    onClose={reset}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <Celebration mode={celebMode} triggerKey={pulseKey} />

        {/* whisper caption */}
        <div className="pointer-events-none relative z-10 mt-9 flex h-16 items-start justify-center px-6 text-center">
          {phase === "spinning" || phase === "charging" ? (
            <span className="caption-in pt-2 font-body text-xs font-light uppercase tracking-[0.5em] text-[#6E7FA3]">Simulating your future</span>
          ) : phase === "idle" ? (
            isLocked ? (
              <span className="pt-2 font-body text-xs font-medium uppercase tracking-[0.35em] text-[#D4AF37]">
                🔒 1 Spin Limit Reached Today · Return Tomorrow
              </span>
            ) : (
              <span className="pt-2 font-body text-xs font-light uppercase tracking-[0.5em] text-[#6E7FA3]">
                Touch the core <span className="mx-2 text-[#D4AF37]">·</span> spin the verse
              </span>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

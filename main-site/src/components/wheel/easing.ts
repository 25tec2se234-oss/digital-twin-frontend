/**
 * Cubic-bezier easing solver (Newton-Raphson) plus a small library of
 * "luxury mechanism" spin profiles. Every spin randomly selects a profile,
 * duration, and rotation count — but none of them affect *where* the wheel
 * stops, only *how* it gets there.
 */

export type Easing = (t: number) => number;

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-4) break;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return sampleY(Math.min(1, Math.max(0, t)));
  };
}

/** Heavy launch, long luxury coast, precise landing — three subtly different characters. */
const PROFILES: Easing[] = [
  cubicBezier(0.34, 0.04, 0.12, 1),
  cubicBezier(0.28, 0.05, 0.15, 0.96),
  cubicBezier(0.4, 0.02, 0.1, 0.98),
];

export interface SpinPlan {
  ease: Easing;
  durationMs: number;
  minTurns: number;
  maxTurns: number;
}

/** A freshly randomized physics character for a single spin. Never affects the landing angle. */
export function randomSpinPlan(): SpinPlan {
  return {
    ease: PROFILES[(Math.random() * PROFILES.length) | 0],
    durationMs: 6200 + Math.random() * 1800, // 6.2s – 8.0s
    minTurns: 4,
    maxTurns: 7,
  };
}

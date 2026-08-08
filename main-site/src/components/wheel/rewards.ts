/**
 * ─────────────────────────────────────────────────────────────────────────
 *  DTV WHEEL — GEOMETRY & REWARD ENGINE
 * ─────────────────────────────────────────────────────────────────────────
 *  This module is the single mathematical source of truth for the wheel.
 *  Every angle, every segment boundary, and — most importantly — the
 *  function that decides "what reward is the needle pointing at" all live
 *  here, so there is exactly one place where that truth can be computed.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Tier = "rare" | "medium" | "common";

export interface Reward {
  id: string;
  /** Primary line rendered on the wheel segment. */
  title: string;
  /** Optional secondary line rendered beneath the title. */
  subtitle?: string;
  icon: string;
  /** Relative probability weight — realistic SaaS probabilities. */
  weight: number;
  gradientId: string;
  iconColor: string;
  variant: "default" | "gold";
  /** Full human-readable name shown on the reward card. */
  label: string;
  description: string;
}

/* ───────────────────────── geometry constants ───────────────────────── */

export const VIEWBOX = 720;
export const CENTER = VIEWBOX / 2;
export const OUTER_RADIUS = 300;
export const DIVIDER_INNER_RADIUS = 136;
export const HUB_RADIUS = 126;

export const NEEDLE_ANGLE = -90;

/* ───────────────────────── reward configuration ───────────────────────── */

export const REWARDS: Reward[] = [
  {
    id: "streak",
    title: "STREAK",
    subtitle: "SAVER",
    icon: "flame",
    weight: 6, // 6%
    gradientId: "gNavyA",
    iconColor: "#C7D4F2",
    variant: "default",
    label: "Streak Saver",
    description: "Your streak is protected. One missed day will no longer undo the momentum you've built — consistency preserved.",
  },
  {
    id: "tour",
    title: "VIRTUAL",
    subtitle: "TOUR",
    icon: "headset",
    weight: 3.9, // 3.9%
    gradientId: "gNavyB",
    iconColor: "#C7D4F2",
    variant: "default",
    label: "Virtual Tour of DTV",
    description: "You've unlocked an exclusive Virtual Tour of DigitalTwin Verse — an insider's walk through your future simulation.",
  },
  {
    id: "extraspin",
    title: "EXTRA",
    subtitle: "SPIN",
    icon: "extraspin",
    weight: 12, // 12% — occasional bonus turn
    gradientId: "gNavyC",
    iconColor: "#9DB4E8",
    variant: "default",
    label: "Extra Spin",
    description: "Fortune favors persistence! You've earned 1 Extra Spin to use immediately.",
  },
  {
    id: "luck",
    title: "BETTER",
    subtitle: "LUCK",
    icon: "star",
    weight: 33, // 33% — common outcome
    gradientId: "gNavyA",
    iconColor: "#8FA6D8",
    variant: "default",
    label: "Better Luck Next Time",
    description: "The wheel turned elsewhere this time — but every spin sharpens your path. Return tomorrow for your next turn!",
  },
  {
    id: "mentor1w",
    title: "1 WEEK",
    subtitle: "MENTORSHIP",
    icon: "cap",
    weight: 0.1, // 0.1% — ultra rare jackpot
    gradientId: "gGold",
    iconColor: "#F6E6A4",
    variant: "gold",
    label: "1 Week Free Mentorship",
    description: "JACKPOT! You've unlocked One Week of Free Mentorship with industry experts who will accelerate your career trajectory.",
  },
  {
    id: "try",
    title: "TRY AGAIN",
    subtitle: "TOMORROW",
    icon: "refresh",
    weight: 45, // 45% — primary non-winning outcome
    gradientId: "gNavyB",
    iconColor: "#8FA6D8",
    variant: "default",
    label: "Try Again Tomorrow",
    description: "Not today — but tomorrow's spin is already waiting. Return with fresh momentum to turn the wheel again.",
  },
];

export const SEGMENT_COUNT = REWARDS.length;
export const SEG_ANGLE = 360 / SEGMENT_COUNT;

export const MOTIVATIONS = [
  "Every achievement brings you one step closer to your dream career.",
  "Keep learning. Your future is built one milestone at a time.",
  "Today's spin is another investment in tomorrow's success.",
];

export function tierOf(r: Reward): Tier {
  if (r.id === "mentor1w") return "rare";
  if (r.id === "luck" || r.id === "try") return "common";
  return "medium";
}

export function grantsAnotherSpin(r: Reward): boolean {
  return r.id === "extraspin";
}

/* ───────────────────────── weighted selection ───────────────────────── */

export function pickWeightedIndex(): number {
  const total = REWARDS.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < REWARDS.length; i++) {
    roll -= REWARDS[i].weight;
    if (roll <= 0) return i;
  }
  return 0;
}

/* ───────────────────────── angle & path math ───────────────────────── */

export function polar(radius: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)];
}

export function segmentBounds(index: number) {
  const start = NEEDLE_ANGLE + index * SEG_ANGLE;
  const end = start + SEG_ANGLE;
  const center = start + SEG_ANGLE / 2;
  return { start, end, center };
}

export function segmentPath(index: number): string {
  const { start, end } = segmentBounds(index);
  const [x0, y0] = polar(OUTER_RADIUS, start);
  const [x1, y1] = polar(OUTER_RADIUS, end);
  return `M ${CENTER} ${CENTER} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

export function annulusPath(a0: number, a1: number, r0: number, r1: number): string {
  const [ox0, oy0] = polar(r1, a0);
  const [ox1, oy1] = polar(r1, a1);
  const [ix0, iy0] = polar(r0, a0);
  const [ix1, iy1] = polar(r0, a1);
  return `M ${ox0.toFixed(2)} ${oy0.toFixed(2)} A ${r1} ${r1} 0 0 1 ${ox1.toFixed(2)} ${oy1.toFixed(2)} L ${ix1.toFixed(2)} ${iy1.toFixed(2)} A ${r0} ${r0} 0 0 0 ${ix0.toFixed(2)} ${iy0.toFixed(2)} Z`;
}

export function segmentIndexAtRotation(rotationDeg: number): number {
  const local = (((-rotationDeg) % 360) + 360) % 360;
  return Math.floor(local / SEG_ANGLE) % SEGMENT_COUNT;
}

export function rotationDeltaForIndex(index: number, currentRotation: number, minTurns = 4, maxTurns = 7) {
  const { center } = segmentBounds(index);
  const targetMod = (((NEEDLE_ANGLE - center) % 360) + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const turns = minTurns + Math.floor(Math.random() * (maxTurns - minTurns + 1));
  const delta = (((targetMod - currentMod) % 360) + 360) % 360 + 360 * turns;
  return { delta, turns };
}

export function fitFontSize(text: string, base: number, maxChars: number): number {
  if (text.length <= maxChars) return base;
  const scale = Math.max(0.72, maxChars / text.length);
  return Math.round(base * scale * 10) / 10;
}

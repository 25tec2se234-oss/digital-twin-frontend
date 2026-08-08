/**
 * Lightweight synthesized sound design for the DTV wheel — no audio files,
 * no external dependencies. Every voice is generated on the Web Audio API
 * and gracefully no-ops if audio is unavailable or blocked.
 */

let ctx: AudioContext | null = null;

export function ensureAudio() {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* silent — audio is a delight, never a dependency */
  }
}

function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine", glideTo?: number) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch {
    /* silent */
  }
}

export const audio = {
  ensure: ensureAudio,
  /** Mechanical tick as a segment divider crosses the needle — volume tracks velocity. */
  tick(vol: number) {
    if (!ctx || vol <= 0.01) return;
    tone(2200, 0, 0.05, 0.04 * vol, "triangle", 1300);
    tone(190, 0, 0.07, 0.05 * vol, "sine");
  },
  /** Rising charge as energy gathers in the core before launch. */
  charge() {
    tone(180, 0, 0.28, 0.035, "sine", 720);
  },
  /** The light beam traveling from the segment into the core. */
  beam() {
    tone(320, 0, 0.5, 0.022, "sine", 980);
  },
  /** The DTV core awakening. */
  awaken(rare: boolean) {
    tone(196, 0, 0.9, 0.04, "sine", 392);
    if (rare) tone(98, 0, 1.1, 0.05, "sine");
  },
  victory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 1.1, 0.045));
    tone(261.63, 0, 1.4, 0.03, "triangle");
  },
  jackpot() {
    tone(72, 0, 0.5, 0.09, "sine", 44);
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) => tone(f, 0.06 + i * 0.07, 1.4, 0.05));
    [2093, 2637, 3136].forEach((f, i) => tone(f, 0.5 + i * 0.1, 1.6, 0.018));
    tone(261.63, 0.06, 1.8, 0.035, "triangle");
  },
  luck() {
    tone(349.23, 0, 1.3, 0.03);
    tone(440, 0.14, 1.2, 0.026);
    tone(523.25, 0.3, 1.2, 0.022);
  },
};

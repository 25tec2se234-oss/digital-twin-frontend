import { useEffect, useRef } from "react";

export type CelebrationMode = "common" | "medium" | "rare" | null;

type Confetti = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; color: string; life: number; max: number; seed: number };
type Spark = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; seed: number; color: string };
type Shard = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; s: number; life: number; max: number };
type Diamond = { x: number; y: number; vy: number; rot: number; vr: number; s: number; life: number; max: number; seed: number };
type Rocket = { delay: number; x: number; y: number; done: boolean };

const GOLD = ["#D4AF37", "#F6E6A4", "#B8860B", "#FFF6D8"];
const MIX = ["#D4AF37", "#F6E6A4", "#0E1C3F", "#E9EDF5", "#2E6BFF"];

export default function Celebration({ mode, triggerKey }: { mode: CelebrationMode; triggerKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confetti = useRef<Confetti[]>([]);
  const sparks = useRef<Spark[]>([]);
  const shards = useRef<Shard[]>([]);
  const diamonds = useRef<Diamond[]>([]);
  const rockets = useRef<Rocket[]>([]);
  const lastSeed = useRef("");
  const engineRef = useRef<{ wakeUp: () => void } | null>(null);

  useEffect(() => {
    const sig = `${mode}-${triggerKey}`;
    if (lastSeed.current === sig) return;
    lastSeed.current = sig;
    if (!mode || triggerKey === 0) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h) * 0.42;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    /* common — a few encouraging motes drifting upward */
    if (mode === "common") {
      for (let i = 0; i < 22; i++) {
        sparks.current.push({
          x: cx + rnd(-base * 0.6, base * 0.6),
          y: cy + rnd(-base * 0.2, base * 0.7),
          vx: rnd(-0.14, 0.14),
          vy: rnd(-0.85, -0.3),
          r: rnd(0.8, 2.1),
          life: 0,
          max: rnd(130, 240),
          seed: Math.random() * 9,
          color: Math.random() < 0.65 ? "#F6E6A4" : "#BFD4FF",
        });
      }
      return;
    }

    const isRare = mode === "rare";
    const palette = isRare ? GOLD : MIX;

    /* confetti ribbons bursting from the rim */
    const n = isRare ? 220 : 85;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rnd(3.2, isRare ? 13 : 8.5);
      confetti.current.push({
        x: cx + Math.cos(a) * base * 0.7,
        y: cy + Math.sin(a) * base * 0.7,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rnd(1.5, 4),
        rot: rnd(0, Math.PI * 2),
        vr: rnd(-0.22, 0.22),
        w: rnd(3, 6.5),
        h: rnd(8, 16),
        color: palette[(Math.random() * palette.length) | 0],
        life: 0,
        max: rnd(130, 215),
        seed: Math.random() * 9,
      });
    }

    /* twinkling sparkles around the wheel */
    const sn = isRare ? 95 : 44;
    for (let i = 0; i < sn; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = base * rnd(0.95, 1.35);
      sparks.current.push({
        x: cx + Math.cos(a) * rr,
        y: cy + Math.sin(a) * rr,
        vx: Math.cos(a) * rnd(0.1, 0.5),
        vy: Math.sin(a) * rnd(0.1, 0.5) - 0.2,
        r: rnd(1, 3),
        life: 0,
        max: rnd(60, 160),
        seed: Math.random() * 9,
        color: Math.random() < 0.75 ? "#FFF6D8" : "#BFD4FF",
      });
    }

    if (isRare) {
      /* crystal fragments */
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rnd(4, 11);
        shards.current.push({
          x: cx + Math.cos(a) * base * 0.5,
          y: cy + Math.sin(a) * base * 0.5,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 2,
          rot: rnd(0, Math.PI * 2),
          vr: rnd(-0.3, 0.3),
          s: rnd(5, 12),
          life: 0,
          max: rnd(90, 160),
        });
      }
      /* floating diamonds rising like embers of light */
      for (let i = 0; i < 14; i++) {
        diamonds.current.push({
          x: cx + rnd(-base, base) * 1.05,
          y: cy + base * rnd(0.4, 1.15),
          vy: -rnd(0.5, 1.25),
          rot: rnd(-0.5, 0.5),
          vr: rnd(-0.02, 0.02),
          s: rnd(4, 10),
          life: 0,
          max: rnd(170, 300),
          seed: Math.random() * 9,
        });
      }
      /* staggered firework bursts */
      rockets.current.push(
        { delay: 6, x: cx + rnd(-base, base) * 0.7, y: cy - rnd(0.5, 1.1) * base, done: false },
        { delay: 34, x: cx + rnd(-base, base) * 0.8, y: cy - rnd(0.4, 1.2) * base, done: false },
        { delay: 64, x: cx + rnd(-base, base) * 0.6, y: cy - rnd(0.5, 1) * base, done: false }
      );
    }

    if (engineRef.current) engineRef.current.wakeUp();
  }, [mode, triggerKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let frameCount = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const burst = (x: number, y: number) => {
      const cols = ["#F6E6A4", "#D4AF37", "#FFF6D8", "#BFD4FF"];
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2 + Math.random() * 0.1;
        const sp = 2 + Math.random() * 6.5;
        sparks.current.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          r: 1 + Math.random() * 1.8,
          life: 0,
          max: 60 + Math.random() * 50,
          seed: Math.random() * 9,
          color: cols[(Math.random() * cols.length) | 0],
        });
      }
    };

    const draw = () => {
      frameCount++;
      ctx.clearRect(0, 0, w, h);

      /* fireworks */
      for (const r of rockets.current) {
        if (!r.done && frameCount >= r.delay) {
          r.done = true;
          burst(r.x, r.y);
        }
      }
      if (rockets.current.length && rockets.current.every((r) => r.done)) rockets.current = [];

      /* confetti ribbons */
      const cf = confetti.current;
      for (let i = cf.length - 1; i >= 0; i--) {
        const c = cf[i];
        c.life++;
        c.vx *= 0.985;
        c.vy = c.vy * 0.985 + 0.12;
        c.x += c.vx;
        c.y += c.vy;
        c.rot += c.vr;
        if (c.life > c.max || c.y > h + 30) {
          cf.splice(i, 1);
          continue;
        }
        const k = 1 - c.life / c.max;
        const flutter = 0.25 + 0.75 * Math.abs(Math.sin(c.life * 0.14 + c.seed));
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.w / 2, (-c.h * flutter) / 2, c.w, c.h * flutter);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      /* crystal shards */
      const sh = shards.current;
      for (let i = sh.length - 1; i >= 0; i--) {
        const s = sh[i];
        s.life++;
        s.vx *= 0.98;
        s.vy = s.vy * 0.98 + 0.08;
        s.x += s.vx;
        s.y += s.vy;
        s.rot += s.vr;
        if (s.life > s.max) {
          sh.splice(i, 1);
          continue;
        }
        const k = 1 - s.life / s.max;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.globalAlpha = k * 0.9;
        const g = ctx.createLinearGradient(-s.s, -s.s, s.s, s.s);
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(0.5, "rgba(150,180,255,0.55)");
        g.addColorStop(1, "rgba(255,255,255,0.15)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -s.s);
        ctx.lineTo(s.s * 0.7, s.s * 0.6);
        ctx.lineTo(-s.s * 0.7, s.s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      /* floating diamonds */
      const dm = diamonds.current;
      for (let i = dm.length - 1; i >= 0; i--) {
        const d = dm[i];
        d.life++;
        d.y += d.vy;
        d.x += Math.sin(d.life * 0.02 + d.seed) * 0.4;
        d.rot += d.vr;
        if (d.life > d.max) {
          dm.splice(i, 1);
          continue;
        }
        const fade = d.life < 30 ? d.life / 30 : d.life > d.max - 50 ? (d.max - d.life) / 50 : 1;
        const tw = 0.7 + 0.3 * Math.sin(d.life * 0.12 + d.seed);
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.globalAlpha = fade * tw;
        const g = ctx.createLinearGradient(0, -d.s, 0, d.s);
        g.addColorStop(0, "rgba(255,255,255,0.98)");
        g.addColorStop(0.45, "rgba(246,230,164,0.85)");
        g.addColorStop(1, "rgba(212,175,55,0.25)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -d.s);
        ctx.lineTo(d.s * 0.62, 0);
        ctx.lineTo(0, d.s);
        ctx.lineTo(-d.s * 0.62, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      /* sparkles — 4-point glints */
      const sp = sparks.current;
      for (let i = sp.length - 1; i >= 0; i--) {
        const s = sp[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.006;
        if (s.life > s.max) {
          sp.splice(i, 1);
          continue;
        }
        const k = 1 - s.life / s.max;
        const tw = Math.abs(Math.sin(s.life * 0.18 + s.seed));
        const a = k * tw;
        const len = s.r * (2.6 + tw * 2.4);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.globalAlpha = a;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(len, 0);
        ctx.moveTo(0, -len);
        ctx.lineTo(0, len);
        ctx.stroke();
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(0, 0, s.r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      const hasParticles = rockets.current.length > 0 || confetti.current.length > 0 || shards.current.length > 0 || diamonds.current.length > 0 || sparks.current.length > 0;
      if (hasParticles) {
        raf = requestAnimationFrame(draw);
      } else {
        raf = 0;
      }
    };

    engineRef.current = {
      wakeUp: () => {
        if (!raf) {
          raf = requestAnimationFrame(draw);
        }
      }
    };
    engineRef.current.wakeUp();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-30 h-full w-full" aria-hidden="true" />;
}

import { useEffect, useRef, type MutableRefObject } from "react";

type P = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  tw: number;
  hue: number; // 0 gold · 1 blue · 2 white
};

type Spark = {
  ang: number;
  rad: number;
  life: number;
  max: number;
  size: number;
  dir: number;
};

const PALETTE = [
  [212, 175, 55],
  [94, 138, 255],
  [236, 240, 250],
] as const;

export default function Particles({
  energyRef,
  hoverRef,
}: {
  energyRef: MutableRefObject<number>;
  hoverRef: MutableRefObject<boolean>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let t = 0;

    const dust: P[] = [];
    const sparks: Spark[] = [];

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

    const COUNT = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 22000));
    for (let i = 0; i < COUNT; i++) {
      dust.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.14,
        vy: -0.05 - Math.random() * 0.16,
        r: 0.6 + Math.random() * 1.7,
        a: 0.08 + Math.random() * 0.4,
        tw: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2,
      });
    }

    const draw = () => {
      t += 1;
      const energy = energyRef.current;
      const boost = hoverRef.current ? 1.55 : 1;
      ctx.clearRect(0, 0, w, h);

      /* ambient dust */
      for (const p of dust) {
        p.x += p.vx + Math.sin(t * 0.004 + p.tw) * (0.06 + (boost - 1) * 0.08);
        p.y += p.vy;
        if (p.y < -6) {
          p.y = h + 6;
          p.x = Math.random() * w;
        }
        if (p.x < -6) p.x = w + 6;
        if (p.x > w + 6) p.x = -6;
        const tw = 0.55 + 0.45 * Math.sin(t * (0.02 * boost) + p.tw * 3);
        const [r, g, b] = PALETTE[p.hue];
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.85, p.a * tw * boost).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      /* orbital sparks while the wheel carries momentum */
      if (energy > 0.04) {
        const base = Math.min(w, h) * 0.46;
        const spawn = Math.round(energy * 5);
        for (let i = 0; i < spawn; i++) {
          sparks.push({
            ang: Math.random() * Math.PI * 2,
            rad: base * (0.96 + Math.random() * 0.1),
            life: 0,
            max: 26 + Math.random() * 30,
            size: 0.7 + Math.random() * 1.8,
            dir: Math.random() < 0.5 ? 1 : -1,
          });
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life++;
        s.ang += 0.045 * s.dir * (0.5 + energy);
        s.rad += 0.35;
        if (s.life > s.max) {
          sparks.splice(i, 1);
          continue;
        }
        const k = 1 - s.life / s.max;
        const x = w / 2 + Math.cos(s.ang) * s.rad;
        const y = h / 2 + Math.sin(s.ang) * s.rad;
        const [r, g, b] = PALETTE[Math.random() < 0.7 ? 0 : 2];
        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${(0.75 * k).toFixed(3)})`;
        ctx.arc(x, y, s.size * k, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sparks.length > 400) sparks.splice(0, sparks.length - 400);

      if (!document.hidden) {
        raf = requestAnimationFrame(draw);
      }
    };
    
    if (!document.hidden) {
      raf = requestAnimationFrame(draw);
    }

    const onVisChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [energyRef, hoverRef]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

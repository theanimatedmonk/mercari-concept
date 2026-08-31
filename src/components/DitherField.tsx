import { useEffect, useRef } from 'react';
import './DitherField.css';

const GAP = 13;
const RADIUS = 220;
const IDLE = 0.22;
const PUSH = 34;

type Speck = {
  ox: number;
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
};

function colorWithAlpha(color: string, alpha: number) {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return `rgb(155 180 222 / ${alpha})`;
  probe.fillStyle = color;
  const parsed = probe.fillStyle;
  const hex = parsed.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`;
  }
  const rgb = parsed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) return `rgb(${rgb[1]} ${rgb[2]} ${rgb[3]} / ${alpha})`;
  return color;
}

export default function DitherField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvasRef.current;
    if (!surface) return;
    const gfx = surface.getContext('2d', { alpha: true });
    if (!gfx) return;
    const canvas: HTMLCanvasElement = surface;
    const ctx: CanvasRenderingContext2D = gfx;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: -9999, y: -9999, px: -9999, py: -9999, speed: 0 };
    let fill = 'rgb(155 180 222 / 0.42)';
    let specks: Speck[] = [];
    let frame = 0;
    let running = true;

    function refreshFill() {
      fill = colorWithAlpha(getComputedStyle(canvas).color, 0.9);
    }

    function rebuild() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      refreshFill();
      specks = [];
      for (let y = GAP * 0.5; y < h; y += GAP) {
        for (let x = GAP * 0.5; x < w; x += GAP) {
          const col = Math.floor(x / GAP);
          const row = Math.floor(y / GAP);
          const ox = x + ((row * 3 + col * 5) % 4) - 1.5;
          const oy = y + ((col * 7 + row * 2) % 4) - 1.5;
          specks.push({
            ox,
            oy,
            x: ox,
            y: oy,
            vx: 0,
            vy: 0,
            phase: (col * 0.37 + row * 0.21) % Math.PI * 2,
          });
        }
      }
    }

    function onPointer(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }

    function tick() {
      if (!running) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dx = pointer.x - pointer.px;
      const dy = pointer.y - pointer.py;
      const inst = Math.hypot(dx, dy);
      pointer.speed += (inst - pointer.speed) * 0.22;
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      const disturb = Math.min(pointer.speed / 18, 1);
      pointer.speed *= 0.9;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = fill;

      const t = frame * 0.016;
      for (const s of specks) {
        const dist = Math.hypot(s.x - pointer.x, s.y - pointer.y);
        const falloff = Math.max(0, 1 - dist / RADIUS);
        const force = disturb * PUSH * falloff * falloff;
        if (force > 0.01) {
          const ang = Math.atan2(s.y - pointer.y, s.x - pointer.x);
          s.vx += Math.cos(ang) * force * 0.08;
          s.vy += Math.sin(ang) * force * 0.08;
        }

        const idle = IDLE * (0.35 + disturb * 0.15);
        s.vx += Math.cos(t + s.phase) * idle * 0.04;
        s.vy += Math.sin(t * 0.9 + s.phase) * idle * 0.04;
        s.vx += (s.ox - s.x) * 0.12;
        s.vy += (s.oy - s.y) * 0.12;
        s.vx *= 0.78;
        s.vy *= 0.78;
        s.x += s.vx;
        s.y += s.vy;

        const shake = Math.min(Math.hypot(s.x - s.ox, s.y - s.oy) / 10, 1);
        const size = 1.4 + shake * 1.4;
        ctx.globalAlpha = 0.45 + shake * 0.5;
        ctx.fillRect(s.x, s.y, size, size);
      }
      ctx.globalAlpha = 1;
      frame += 1;
      requestAnimationFrame(tick);
    }

    rebuild();
    if (!reduced) requestAnimationFrame(tick);
    else {
      ctx.fillStyle = fill;
      for (const s of specks) ctx.fillRect(s.ox, s.oy, 1.2, 1.2);
    }

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', rebuild);
    return () => {
      running = false;
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', rebuild);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="dither-field"
      aria-hidden
    />
  );
}

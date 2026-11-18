import React, { useEffect, useRef } from 'react';

interface ConfettiBurstProps {
  active: boolean;
  triggerKey?: string | number;
}

type ParticleShape = 'ribbon' | 'diamond' | 'circle';

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  shape: ParticleShape;
  rot: number;
  rotSpeed: number;
  tilt: number;
  tiltSpeed: number;
  flutterFreq: number;
  flutterAmp: number;
  phase: number;
  age: number;
  maxLife: number;
}

const CONFETTI_PALETTE = [
  '#fbbf24', // Amber gold
  '#f59e0b', // Deep gold
  '#fef08a', // Sunbeam highlight
  '#34d399', // Jungle emerald
  '#f97316', // Sunset orange
  '#38bdf8', // Tropical sky
  '#fb7185', // Hibiscus coral
  '#ffffff', // Crisp white
];

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ active, triggerKey }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.clientWidth || window.innerWidth;
    let height = canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: ConfettiParticle[] = [];

    const spawnCannon = (
      originX: number,
      originY: number,
      baseAngle: number,
      spread: number,
      minSpeed: number,
      maxSpeed: number,
      count: number
    ) => {
      for (let i = 0; i < count; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        const shapeRoll = Math.random();
        const shape: ParticleShape =
          shapeRoll < 0.68 ? 'ribbon' : shapeRoll < 0.88 ? 'diamond' : 'circle';

        particles.push({
          x: originX + (Math.random() - 0.5) * 18,
          y: originY + (Math.random() - 0.5) * 18,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: shape === 'ribbon' ? 6 + Math.random() * 5 : 5 + Math.random() * 4,
          h: shape === 'ribbon' ? 10 + Math.random() * 6 : 5 + Math.random() * 4,
          color: CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)],
          shape,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 8.5,
          tilt: Math.random() * Math.PI * 2,
          tiltSpeed: 5 + Math.random() * 8,
          flutterFreq: 4 + Math.random() * 5,
          flutterAmp: 22 + Math.random() * 34,
          phase: Math.random() * Math.PI * 2,
          age: 0,
          maxLife: 2.3 + Math.random() * 1.1,
        });
      }
    };

    // Initial twin corner cannons + central 3-star explosion
    const speedScale = Math.max(0.85, Math.min(1.25, height / 760));
    spawnCannon(width * 0.14, height * 0.72, -Math.PI * 0.36, 0.72, 560 * speedScale, 920 * speedScale, 44);
    spawnCannon(width * 0.86, height * 0.72, -Math.PI * 0.64, 0.72, 560 * speedScale, 920 * speedScale, 44);
    spawnCannon(width * 0.5, height * 0.42, -Math.PI * 0.5, Math.PI * 1.7, 220 * speedScale, 640 * speedScale, 48);

    // Delayed second crown pop for rewarding 3-star celebration
    const secondBurstTimer = window.setTimeout(() => {
      spawnCannon(width * 0.5, height * 0.34, -Math.PI * 0.5, Math.PI * 1.9, 240 * speedScale, 560 * speedScale, 54);
    }, 220);

    window.addEventListener('resize', resize);

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      const drag = Math.pow(0.982, dt * 60);
      const gravity = 660;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.maxLife || p.y > height + 40) {
          particles.splice(i, 1);
          continue;
        }

        p.vx *= drag;
        p.vy = Math.min(340, p.vy * drag + gravity * dt);

        const flutterVx = Math.sin(p.age * p.flutterFreq + p.phase) * p.flutterAmp;
        p.x += (p.vx + flutterVx) * dt;
        p.y += p.vy * dt;
        p.rot += p.rotSpeed * dt;
        p.tilt += p.tiltSpeed * dt;

        const lifeRemaining = p.maxLife - p.age;
        const alpha = lifeRemaining < 0.65 ? Math.max(0, lifeRemaining / 0.65) : 1;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;

        if (p.shape === 'ribbon') {
          const scaleY = Math.cos(p.tilt);
          ctx.scale(1, Math.abs(scaleY) < 0.15 ? (scaleY < 0 ? -0.15 : 0.15) : scaleY);
          ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
        } else if (p.shape === 'diamond') {
          const s = p.w * 0.55;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.75, 0);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.75, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.36, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.clearTimeout(secondBurstTimer);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [active, triggerKey]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
    />
  );
};

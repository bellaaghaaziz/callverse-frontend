"use client";

import { useEffect, useRef } from "react";
import { forEachNeighborPair, particleBudget } from "@/components/canvas/neighbors";
import { prefersReducedMotion } from "@/lib/intro";

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}

const COLORS = ["#6366f1", "#06b6d4", "#8b5cf6", "#3b82f6", "#10b981"];
const LINK_DISTANCE = 110;
const GRID_SPACING = 80;
const PARALLAX = 0.4;
/** Decorative glows and dots: 1x density is visually enough and keeps the per-frame fill cost low (measured). */
const MAX_DPR = 1;

/**
 * Decorative particle background for the landing and login pages.
 * Cost controls: capped particle count, grid-based neighbour search instead
 * of all pairs, no per-particle shadowBlur, DPR cap, paused while the tab is
 * hidden, and nothing at all under reduced motion.
 */
export default function DynamicCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let scrollY = window.scrollY;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: particleBudget(width, height) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height * 2,
        size: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.6 + 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(width / 2, height / 2 - scrollY * 0.2, 100, width / 2, height / 2, Math.max(width, height));
      glow.addColorStop(0, "rgba(99, 102, 241, 0.08)");
      glow.addColorStop(0.5, "rgba(6, 182, 212, 0.04)");
      glow.addColorStop(1, "rgba(8, 12, 20, 0.95)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // One path for the whole grid instead of one stroke per line.
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += GRID_SPACING) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = -GRID_SPACING + ((scrollY * 0.3) % GRID_SPACING); y < height; y += GRID_SPACING) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Move, then project to the screen with scroll parallax.
      const onScreen: { x: number; y: number; p: Particle }[] = [];
      for (const p of particles) {
        p.x = (p.x + p.vx + width) % width;
        p.y = (p.y + p.vy + height * 2) % (height * 2);
        const projected = (p.y - scrollY * PARALLAX) % (height * 1.5);
        const y = projected < 0 ? projected + height * 1.5 : projected;
        if (y <= height + 50) onScreen.push({ x: p.x, y, p });
      }

      ctx.lineWidth = 0.8;
      forEachNeighborPair(onScreen, LINK_DISTANCE, (i, j, d) => {
        ctx.globalAlpha = (1 - d / LINK_DISTANCE) * 0.15;
        ctx.strokeStyle = onScreen[i].p.color;
        ctx.beginPath();
        ctx.moveTo(onScreen[i].x, onScreen[i].y);
        ctx.lineTo(onScreen[j].x, onScreen[j].y);
        ctx.stroke();
      });

      // A soft halo (wide, faint disc) replaces the costly shadowBlur.
      for (const { x, y, p } of onScreen) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.18;
        ctx.beginPath();
        ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const onScroll = () => {
      scrollY = window.scrollY;
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}

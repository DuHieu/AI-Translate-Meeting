import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  highlightAlpha: number;
}

export const NeuralLinguisticBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let previousFrame = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates relative to window
    const mouse = {
      x: -1000,
      y: -1000,
      radius: 180, // Interaction radius for neural synaptic connection
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Particle nodes representing multilingual voice signals
    let particles: Particle[] = [];
    const particleDensityFactor = 12000; // 1 particle per 12000 px^2

    const initParticles = () => {
      particles = [];
      const count = Math.max(18, Math.min(60, Math.floor((width * height) / particleDensityFactor)));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius: Math.random() * 1.8 + 1.2,
          baseAlpha: Math.random() * 0.35 + 0.25,
          highlightAlpha: 0,
        });
      }
    };

    initParticles();

    // Check dark mode
    const isDarkMode = () => document.documentElement.classList.contains('dark');

    const render = (timestamp = 0) => {
      if (document.visibilityState !== 'visible') return;
      if (!reducedMotion.matches && timestamp - previousFrame < 33) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      previousFrame = timestamp;
      ctx.clearRect(0, 0, width, height);
      const dark = isDarkMode();

      // Theme-aware color palettes
      // Dark mode: Electric Cobalt (#3b82f6) & Vibrant Cyan/Indigo (#06b6d4, #6366f1)
      // Light mode: Deep Corporate Blue (#2563eb) & Royal Blue (#1d4ed8)
      const primaryRgb = dark ? '59, 130, 246' : '37, 99, 235';
      const accentRgb = dark ? '14, 165, 233' : '30, 64, 175';

      // 1. Update particles & draw synaptic connections
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries smoothly
        if (p.x < 0) p.x = width;
        else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        else if (p.y > height) p.y = 0;

        // Distance from cursor
        const dxMouse = p.x - mouse.x;
        const dyMouse = p.y - mouse.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < mouse.radius) {
          // Glow intensely when near mouse (represent activated linguistic pathway)
          const factor = 1 - distMouse / mouse.radius;
          p.highlightAlpha = Math.min(1, p.highlightAlpha + factor * 0.1);
        } else {
          p.highlightAlpha = Math.max(0, p.highlightAlpha - 0.03);
        }

        // Draw connections between neighboring particles (linguistic web)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxConnectDist = 130;

          if (dist < maxConnectDist) {
            const baseConnectAlpha = (1 - dist / maxConnectDist) * (dark ? 0.16 : 0.12);
            // Boost connection if near cursor
            const boost = (p.highlightAlpha + p2.highlightAlpha) * 0.45;
            const alpha = Math.min(0.85, baseConnectAlpha + boost);

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${primaryRgb}, ${alpha})`;
            ctx.lineWidth = boost > 0.1 ? 1.4 : 0.8;
            ctx.stroke();
          }
        }

        // Connect directly to the cursor (Interactive Neural Synapse Link)
        if (distMouse < mouse.radius) {
          const connectAlpha = (1 - distMouse / mouse.radius) * (dark ? 0.75 : 0.6);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${accentRgb}, ${connectAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Draw node (Voice Packet Node)
        const currentAlpha = Math.min(1, p.baseAlpha + p.highlightAlpha * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + p.highlightAlpha * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryRgb}, ${currentAlpha})`;
        ctx.fill();

        // Node subtle halo glow
        if (p.highlightAlpha > 0.1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${accentRgb}, ${p.highlightAlpha * 0.25})`;
          ctx.fill();
        }
      }

      // Cursor neural focal ring
      if (mouse.x > 0 && mouse.y > 0) {
        const gradient = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          mouse.radius
        );
        gradient.addColorStop(0, `rgba(${primaryRgb}, ${dark ? 0.15 : 0.08})`);
        gradient.addColorStop(0.5, `rgba(${accentRgb}, ${dark ? 0.05 : 0.03})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      if (!reducedMotion.matches) animationFrameId = requestAnimationFrame(render);
    };

    const resume = () => { cancelAnimationFrame(animationFrameId); previousFrame = 0; render(33); };
    document.addEventListener('visibilitychange', resume);
    reducedMotion.addEventListener('change', resume);
    resume();

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('visibilitychange', resume);
      reducedMotion.removeEventListener('change', resume);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden="true"
    />
  );
};

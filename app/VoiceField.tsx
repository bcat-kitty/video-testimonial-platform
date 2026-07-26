'use client';

import { useEffect, useRef } from 'react';

/**
 * The interactive background: a field of bars that behaves like a voice
 * waveform. It breathes on its own, and spikes wherever the pointer goes, as
 * though you were talking into it.
 *
 * On theme on purpose. This product is about getting people to talk instead of
 * write, so the one ambient visual on the page is the shape of a voice.
 *
 * Self-contained and cheap: one canvas, one rAF loop, no dependencies. It stops
 * when the tab is hidden, and renders a single flat line (no animation) when the
 * visitor asks for reduced motion.
 */
export default function VoiceField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--debrief-accent')
      .trim() || '#4f46e5';

    const GAP = 13;
    const BAR = 3;

    let width = 0;
    let height = 0;
    let bars = 0;
    let raf = 0;
    let running = true;

    // Pointer influence decays toward 0 when the pointer leaves, so the field
    // settles back to its ambient state instead of snapping.
    const pointer = { x: -9999, y: -9999, strength: 0, target: 0 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      bars = Math.ceil(width / GAP) + 1;
    }

    function draw(time: number) {
      if (!running) return;
      const t = time / 1000;
      const mid = height / 2;

      ctx!.clearRect(0, 0, width, height);

      pointer.strength += (pointer.target - pointer.strength) * 0.08;

      for (let i = 0; i < bars; i++) {
        const x = i * GAP;

        // Two detuned sines so the ambient motion never looks like a metronome.
        const ambient = reduced
          ? 0
          : Math.sin(x * 0.014 - t * 1.1) * 10 + Math.sin(x * 0.031 + t * 0.7) * 6;

        // Pointer excitation: a bell curve centred on the cursor.
        const dx = x - pointer.x;
        const falloff = Math.exp(-(dx * dx) / 12000);
        const excite = falloff * pointer.strength * 46;

        const amp = Math.max(1.5, Math.abs(ambient) + excite + 3);
        const heat = Math.min(1, (excite / 46) * 1.4);

        ctx!.fillStyle = heat > 0.01 ? accent : '#e4e4e7';
        ctx!.globalAlpha = 0.28 + heat * 0.62;

        const h = amp * 2;
        const r = BAR / 2;
        ctx!.beginPath();
        ctx!.roundRect(x, mid - h / 2, BAR, h, r);
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      // React while the pointer is anywhere in the hero above the band, so the
      // effect is discoverable, but let it settle once you scroll well past it.
      pointer.target = e.clientY < rect.bottom + 80 && e.clientY > rect.top - 420 ? 1 : 0;
    }

    function onPointerLeave() {
      pointer.target = 0;
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    }

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-36 w-full sm:h-48"
      style={{
        maskImage: 'linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)',
      }}
    />
  );
}

'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';

export type UniversalLoaderTheme = 'light' | 'dark' | 'auto';

export type UniversalLoaderProps = {
  isVisible?: boolean;
  brand?: string;
  theme?: UniversalLoaderTheme;
  message?: string;
  hint?: string;
  steps?: string[];
  interactive?: boolean;
};

const defaultSteps = [
  'Initializing interface...',
  'Loading homepage content...',
  'Preparing featured projects...',
  'Finalizing experience...',
];

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(Boolean(media.matches));
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return reduced;
};

export default function UniversalLoader({
  isVisible = true,
  brand = 'Welcome',
  theme = 'auto',
  message,
  hint,
  steps,
  interactive = true,
}: UniversalLoaderProps) {
  const reducedMotion = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [pressed, setPressed] = useState(false);

  const resolvedSteps = steps && steps.length > 0 ? steps : defaultSteps;

  useEffect(() => {
    if (!isVisible) {
      setMounted(false);
      setStepIndex(0);
      return;
    }

    const enterTimer = window.setTimeout(() => setMounted(true), 30);
    let stepTimer: number | null = null;

    if (!reducedMotion) {
      stepTimer = window.setInterval(() => {
        setStepIndex((prev) => (prev + 1) % resolvedSteps.length);
      }, 1400);
    }

    return () => {
      window.clearTimeout(enterTimer);
      if (stepTimer) {
        window.clearInterval(stepTimer);
      }
    };
  }, [isVisible, reducedMotion, resolvedSteps.length]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const progressWidth = useMemo(() => {
    return `${((stepIndex + 1) / resolvedSteps.length) * 100}%`;
  }, [resolvedSteps.length, stepIndex]);

  const isDark =
    theme === 'dark' ||
    (theme === 'auto' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const title = brand || 'Welcome';
  const primaryLine = message || 'Preparing portfolio experience';
  const secondaryLine = hint || 'Loading projects, skills, and featured work...';

  const setCardStyle = (clientX: number, clientY: number) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const pctX = Math.max(0, Math.min(1, localX / rect.width));
    const pctY = Math.max(0, Math.min(1, localY / rect.height));

    const dx = pctX - 0.5;
    const dy = pctY - 0.5;

    card.style.setProperty('--ul-glow-x', `${(pctX * 100).toFixed(2)}%`);
    card.style.setProperty('--ul-glow-y', `${(pctY * 100).toFixed(2)}%`);
    card.style.setProperty('--ul-tilt-x', `${(-dy * 6).toFixed(2)}deg`);
    card.style.setProperty('--ul-tilt-y', `${(dx * 8).toFixed(2)}deg`);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !interactive) return;
    if (event.pointerType === 'touch') return;

    const { clientX, clientY } = event;
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = window.requestAnimationFrame(() => {
      setCardStyle(clientX, clientY);
    });
  };

  const handlePointerLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.setProperty('--ul-tilt-x', '0deg');
    cardRef.current.style.setProperty('--ul-tilt-y', '0deg');
  };

  const handlePointerDown = () => {
    if (reducedMotion || !interactive) return;
    setPressed(true);
  };

  const handlePointerUp = () => {
    setPressed(false);
  };

  if (!isVisible) return null;

  const cardTransform = reducedMotion || !interactive
    ? `scale(${pressed ? 0.985 : 1})`
    : `perspective(900px) rotateX(var(--ul-tilt-x, 0deg)) rotateY(var(--ul-tilt-y, 0deg)) scale(${pressed ? 0.985 : 1})`;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden px-4 transition-all duration-500 ${
        mounted ? 'opacity-100' : 'opacity-0'
      } ${
        isDark
          ? 'bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_28%),linear-gradient(135deg,#050816_0%,#0b1120_45%,#0f172a_100%)]'
          : 'bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.10),_transparent_24%),linear-gradient(135deg,#f8fbff_0%,#eef4ff_45%,#e9f1ff_100%)]'
      }`}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div
        className={`pointer-events-none absolute -left-16 top-8 h-56 w-56 rounded-full blur-3xl ${
          reducedMotion ? '' : 'animate-pulse'
        } ${isDark ? 'bg-cyan-400/10' : 'bg-sky-300/25'}`}
      />
      <div
        className={`pointer-events-none absolute -bottom-20 right-0 h-72 w-72 rounded-full blur-3xl ${
          reducedMotion ? '' : 'animate-pulse'
        } ${isDark ? 'bg-blue-500/10' : 'bg-cyan-200/30'}`}
      />

      <div
        className={`pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] ${
          isDark ? 'opacity-[0.06]' : 'opacity-[0.04]'
        }`}
      />

      <div
        ref={cardRef}
        className={`relative w-full max-w-md rounded-[28px] px-6 py-8 shadow-[0_24px_90px_rgba(0,0,0,0.12)] backdrop-blur-2xl transition-all duration-500 sm:px-8 sm:py-10 ${
          mounted ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
        } ${isDark ? 'border border-white/10 bg-white/[0.04]' : 'border border-slate-200/70 bg-white/60'}`}
        style={{ transform: cardTransform }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 transition-opacity duration-300"
          style={{
            opacity: reducedMotion || !interactive ? 0 : 1,
            background: isDark
              ? 'radial-gradient(circle at var(--ul-glow-x, 50%) var(--ul-glow-y, 50%), rgba(34,211,238,0.18), transparent 58%)'
              : 'radial-gradient(circle at var(--ul-glow-x, 50%) var(--ul-glow-y, 50%), rgba(59,130,246,0.14), transparent 60%)',
          }}
        />

        <div
          className={`pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ${
            isDark ? 'ring-cyan-300/10' : 'ring-sky-300/20'
          }`}
        />
        <div
          className={`pointer-events-none absolute -bottom-px right-0 h-24 w-24 rounded-full blur-2xl ${
            isDark ? 'bg-cyan-300/10' : 'bg-sky-300/20'
          }`}
        />

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
          <div className="relative h-16 w-16">
            <div className={`absolute inset-0 rounded-full border-[3px] ${isDark ? 'border-white/10' : 'border-slate-300/70'}`} />
            <div
              className={`absolute inset-0 rounded-full border-[3px] border-transparent ${
                reducedMotion ? '' : 'animate-spin'
              } ${isDark ? 'border-t-cyan-300 border-r-sky-400' : 'border-t-sky-500 border-r-cyan-400'}`}
            />
            <div className={`absolute inset-[10px] rounded-full blur-md ${isDark ? 'bg-cyan-300/10' : 'bg-sky-300/25'}`} />
            <div
              className={`absolute inset-[18px] rounded-full border ${
                isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white/70'
              }`}
            />
          </div>
        </div>

        <div className="text-center">
          <h1 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h1>

          <p className={`mt-3 text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{primaryLine}</p>
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{secondaryLine}</p>

          <div className="mt-5 flex items-center justify-center gap-3">
            {[0, 150, 300, 450].map((delay) => (
              <span
                key={delay}
                className={`h-1.5 w-1.5 rounded-full ${reducedMotion ? '' : 'animate-bounce'} ${
                  isDark ? 'bg-cyan-300' : 'bg-sky-500'
                }`}
                style={reducedMotion ? undefined : { animationDelay: `${delay}ms` }}
              />
            ))}
          </div>

          <div className={`mt-6 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200/80'}`}>
            <div
              className={`h-1.5 rounded-full transition-all duration-700 ease-out ${
                isDark
                  ? 'bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-400'
                  : 'bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-500'
              }`}
              style={{ width: progressWidth }}
            />
          </div>

          <p className={`mt-4 text-[11px] uppercase tracking-[0.28em] ${isDark ? 'text-cyan-200/70' : 'text-sky-600/70'}`}>
            {resolvedSteps[stepIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}

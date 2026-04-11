'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion';
import { useLoadingStore } from '@/store/loading';

const orbitTags = [
  { label: 'Scan', className: 'left-1 top-12 sm:left-2 sm:top-16' },
  { label: 'Sync', className: 'right-0 top-20 sm:right-3 sm:top-24' },
  { label: 'Shift', className: 'bottom-14 left-2 sm:bottom-16 sm:left-5' },
  { label: 'Warp', className: 'bottom-10 right-1 sm:bottom-14 sm:right-4' },
];

export default function GlobalLoader({
  forceVisible = false,
  message: forcedMessage,
  hint = 'Move your cursor and the loader field will bend with it.',
}) {
  const loading = useLoadingStore((state) => state.loading);
  const message = useLoadingStore((state) => state.message);
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateX = useTransform(pointerY, [0, 1], [10, -10]);
  const rotateY = useTransform(pointerX, [0, 1], [-14, 14]);
  const glowX = useTransform(pointerX, [0, 1], ['18%', '82%']);
  const glowY = useTransform(pointerY, [0, 1], ['20%', '80%']);
  const background = useMotionTemplate`
    radial-gradient(circle at ${glowX} ${glowY}, rgba(34, 211, 238, 0.28), transparent 28%),
    radial-gradient(circle at 50% 50%, rgba(244, 114, 182, 0.16), transparent 38%),
    linear-gradient(135deg, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.94) 44%, rgba(17, 24, 39, 0.98))
  `;
  const visible = forceVisible || loading;
  const activeMessage = forcedMessage || message || 'Loading the next scene';

  useEffect(() => {
    if (!visible || typeof window === 'undefined') {
      return undefined;
    }

    const recenter = () => {
      pointerX.set(0.5);
      pointerY.set(0.5);
    };

    const handlePointerMove = (event) => {
      pointerX.set(event.clientX / window.innerWidth);
      pointerY.set(event.clientY / window.innerHeight);
    };

    const handleTouchMove = (event) => {
      const touch = event.touches?.[0];
      if (!touch) {
        return;
      }

      pointerX.set(touch.clientX / window.innerWidth);
      pointerY.set(touch.clientY / window.innerHeight);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('blur', recenter);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('blur', recenter);
      recenter();
    };
  }, [visible, pointerX, pointerY]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-slate-950/86 px-4 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          aria-live="polite"
          aria-busy="true"
          role="status"
        >
          <motion.div className="absolute inset-0" style={{ background }} />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

          <motion.div
            className="relative flex h-[21rem] w-[21rem] items-center justify-center sm:h-[25rem] sm:w-[25rem]"
            style={{
              rotateX,
              rotateY,
              transformPerspective: 1400,
              transformStyle: 'preserve-3d',
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-300/20 bg-cyan-400/5 shadow-[0_0_90px_rgba(34,211,238,0.12)]"
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="absolute inset-5 rounded-full border border-fuchsia-300/20 border-dashed"
              animate={{ rotate: -360, scale: [1, 1.02, 1] }}
              transition={{
                rotate: { duration: 14, repeat: Infinity, ease: 'linear' },
                scale: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
            <motion.div
              className="absolute inset-12 rounded-[2.25rem] border border-white/12 bg-white/8 p-6 shadow-[0_0_70px_rgba(56,189,248,0.14)] backdrop-blur-2xl sm:p-7"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex h-full flex-col justify-between rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-5 text-white">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.42em] text-cyan-200/80">
                  <span>Universal</span>
                  <motion.span
                    className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.95)]"
                    animate={{ opacity: [0.45, 1, 0.45], scale: [0.92, 1.14, 0.92] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.34em] text-white/45">Loader Field</p>
                  <h2 className="font-['Bebas_Neue'] text-4xl uppercase leading-[0.9] tracking-[0.08em] text-white sm:text-5xl">
                    Loading
                  </h2>
                  <p className="max-w-[13rem] text-sm leading-relaxed text-white/78 sm:max-w-[14.5rem]">
                    {activeMessage}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.45),rgba(255,255,255,0.95),rgba(244,114,182,0.45))]"
                      animate={{ x: ['-35%', '105%'] }}
                      transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ width: '42%' }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.26em] text-white/46">
                    <span>Render</span>
                    <span>Align</span>
                    <span>Reveal</span>
                  </div>

                  <p className="text-[11px] leading-relaxed text-cyan-100/70">{hint}</p>
                </div>
              </div>
            </motion.div>

            {orbitTags.map((tag, index) => (
              <motion.div
                key={tag.label}
                className={`absolute rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/72 backdrop-blur ${tag.className}`}
                animate={{
                  y: [0, -10 - index * 2, 0],
                  x: [0, index % 2 === 0 ? 6 : -6, 0],
                }}
                transition={{
                  duration: 2.8 + index * 0.45,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {tag.label}
              </motion.div>
            ))}

            <motion.div
              className="absolute h-2 w-2 rounded-full bg-fuchsia-300 shadow-[0_0_22px_rgba(244,114,182,0.9)]"
              animate={{
                rotate: 360,
                x: [0, 118, 0, -118, 0],
                y: [-118, 0, 118, 0, -118],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

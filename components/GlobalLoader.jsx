'use client';

import { useLoadingStore } from '@/store/loading';

export default function GlobalLoader({
  forceVisible = false,
  message: forcedMessage,
  hint = 'Loading content...',
}) {
  const loading = useLoadingStore((state) => state.loading);
  const message = useLoadingStore((state) => state.message);
  const visible = forceVisible || loading;
  const activeMessage = forcedMessage || message || 'Loading';

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-cyan-300" />
        <p className="mt-4 text-lg font-semibold text-white">Loading</p>
        <p className="mt-2 text-sm text-white/75">{activeMessage}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.22em] text-white/45">{hint}</p>
      </div>
    </div>
  );
}

'use client';

import { useLoadingStore } from '@/store/loading';

export default function GlobalLoader() {
  const loading = useLoadingStore((state) => state.loading);

  if (!loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" aria-live="polite" aria-busy="true">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
    </div>
  );
}

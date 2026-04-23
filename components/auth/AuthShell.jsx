'use client';

import Link from 'next/link';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AuthShell({
  title,
  description,
  eyebrow = 'Neon Auth',
  footer,
  children,
  className,
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf4ff] px-4 py-10 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-72 w-72 rounded-full bg-cyan-200/50 blur-3xl" />
        <div className="absolute right-[-8%] top-[12%] h-80 w-80 rounded-full bg-blue-300/40 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[14%] h-80 w-80 rounded-full bg-sky-200/45 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.85),_rgba(237,244,255,0.35)_42%,_transparent_72%)]" />
      </div>

      <section
        className={cn(
          'relative w-full max-w-[560px] rounded-[34px] border border-slate-200/80 bg-white/92 p-6 shadow-[0_40px_120px_-48px_rgba(37,99,235,0.55)] backdrop-blur-xl sm:p-9',
          className,
        )}
      >
        <div className="mx-auto flex w-full max-w-[440px] flex-col">
          <div className="mx-auto flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>JDN Control</span>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-blue-500">{eyebrow}</p>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-900 sm:text-6xl">{title}</h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-500 sm:text-lg">{description}</p>
          </div>

          <div className="mt-8">{children}</div>

          <div className="mt-8 border-t border-slate-200/80 pt-6 text-center text-sm text-slate-500">
            <div className="flex items-center justify-center gap-2 font-medium text-slate-500">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span>Secure access for approved workspace users</span>
            </div>
            {footer ? <div className="mt-5">{footer}</div> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export function AuthDivider({ label = 'or' }) {
  return (
    <div className="my-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
      <div className="h-px flex-1 bg-slate-200" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

export function AuthFooterLinks({ primaryHref, primaryLabel, secondaryHref = '/', secondaryLabel = 'Return home' }) {
  return (
    <div className="space-y-3">
      <p>
        <Link href={secondaryHref} className="font-semibold text-slate-500 transition hover:text-slate-900">
          {secondaryLabel}
        </Link>
      </p>
      <p>
        <Link href={primaryHref} className="font-semibold text-blue-600 transition hover:text-blue-700">
          {primaryLabel}
        </Link>
      </p>
    </div>
  );
}

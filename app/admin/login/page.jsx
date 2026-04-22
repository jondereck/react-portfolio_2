'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSession, signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

const adminLastVisitedPathStorageKey = 'admin:lastVisitedPath';
const authLastVisitedPathStorageKey = 'auth:lastVisitedPath';

const normalizeProtectedPath = (value) => {
  if (!value || typeof value !== 'string') return null;

  try {
    const resolved = new URL(value, window.location.origin);
    if (resolved.origin !== window.location.origin) {
      return null;
    }
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (!path.startsWith('/admin') && !path.startsWith('/gallery')) {
      return null;
    }
    if (resolved.pathname === '/admin/login') {
      return null;
    }
    return path;
  } catch {
    return null;
  }
};

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get('callbackUrl') || '/admin',
    [searchParams],
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!blockedUntil || typeof blockedUntil !== 'number') {
      return;
    }

    const tick = () => {
      if (Date.now() >= blockedUntil) {
        setBlockedUntil(null);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [blockedUntil]);

  const formatRetryTime = (epochMs) => new Date(epochMs).toLocaleString();

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const session = await getSession();
        if (!active || !session?.user) return;
        if (typeof window === 'undefined') return;

        const safeCallback = normalizeProtectedPath(callbackUrl);
        const safeLastVisitedAuth = normalizeProtectedPath(
          window.localStorage.getItem(authLastVisitedPathStorageKey) || '',
        );
        const safeLastVisitedAdmin = normalizeProtectedPath(
          window.localStorage.getItem(adminLastVisitedPathStorageKey) || '',
        );
        const safeReferrer = normalizeProtectedPath(document.referrer || '');
        const target =
          safeCallback ||
          safeLastVisitedAuth ||
          safeLastVisitedAdmin ||
          safeReferrer ||
          '/admin';

        setRedirecting(true);
        window.location.assign(target);
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, [callbackUrl]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (blockedUntil && typeof blockedUntil === 'number' && blockedUntil > Date.now()) {
      setError(`Too many attempts. Try again at ${formatRetryTime(blockedUntil)}.`);
      return;
    }
    setSubmitting(true);
    setError('');

    const safeCallbackFromQuery = normalizeProtectedPath(callbackUrl);
    const safeLastVisitedAuth = normalizeProtectedPath(
      window.localStorage.getItem(authLastVisitedPathStorageKey) || '',
    );
    const safeLastVisitedAdmin = normalizeProtectedPath(
      window.localStorage.getItem(adminLastVisitedPathStorageKey) || '',
    );
    const safeReferrer = normalizeProtectedPath(document.referrer || '');
    const safeCallback =
      safeCallbackFromQuery ||
      safeLastVisitedAuth ||
      safeLastVisitedAdmin ||
      safeReferrer ||
      '/admin';

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: safeCallback,
    });

    setSubmitting(false);
    if (!result || result.error) {
      const code = typeof result?.code === 'string' ? result.code : '';
      if (code.startsWith('lock_')) {
        const retryAt = Number(code.slice('lock_'.length));
        if (Number.isFinite(retryAt) && retryAt > 0) {
          setBlockedUntil(retryAt);
          setError(`Too many attempts. Try again at ${formatRetryTime(retryAt)}.`);
          return;
        }
      }

      if (code.startsWith('warn_')) {
        const remaining = Number(code.slice('warn_'.length));
        if (Number.isFinite(remaining)) {
          setError(`Invalid credentials. ${remaining} retries left before temporary lockout.`);
          return;
        }
      }

      setError('Invalid credentials.');
      return;
    }

    setBlockedUntil(null);
    window.location.assign(normalizeProtectedPath(result.url || '') || safeCallback);
  };

  const isLocked = blockedUntil && typeof blockedUntil === 'number' && blockedUntil > Date.now();
  const disableInputs = submitting || redirecting || checkingSession || isLocked;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Admin Access</p>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Use your email and password to access the admin workspace.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            type="email"
            value={email}
            placeholder="Email"
            autoComplete="email"
            disabled={disableInputs}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            value={password}
            placeholder="Password"
            autoComplete="current-password"
            disabled={disableInputs}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={disableInputs}>
            {redirecting ? 'Redirecting...' : submitting ? 'Signing in...' : checkingSession ? 'Checking session...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-xs text-slate-500">
          Public site:{' '}
          <Link href="/" className="text-cyan-300 hover:text-cyan-200">
            return home
          </Link>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Need an account?{' '}
          <Link href="/register" className="text-cyan-300 hover:text-cyan-200">
            request access
          </Link>
        </p>
      </div>
    </main>
  );
}

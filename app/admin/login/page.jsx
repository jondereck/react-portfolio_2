'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeProtectedPath } from '@/lib/auth/redirects';

const adminLastVisitedPathStorageKey = 'admin:lastVisitedPath';
const authLastVisitedPathStorageKey = 'auth:lastVisitedPath';

function getStoredCallbackTarget(callbackUrl) {
  if (typeof window === 'undefined') {
    return '/admin';
  }

  const safeCallbackFromQuery = normalizeProtectedPath(callbackUrl, window.location.origin);
  const safeLastVisitedAuth = normalizeProtectedPath(
    window.localStorage.getItem(authLastVisitedPathStorageKey) || '',
    window.location.origin,
  );
  const safeLastVisitedAdmin = normalizeProtectedPath(
    window.localStorage.getItem(adminLastVisitedPathStorageKey) || '',
    window.location.origin,
  );
  const safeReferrer = normalizeProtectedPath(document.referrer || '', window.location.origin);

  return safeCallbackFromQuery || safeLastVisitedAuth || safeLastVisitedAdmin || safeReferrer || '/admin';
}

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') || '/admin', [searchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [submittingMode, setSubmittingMode] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [neonConfigured, setNeonConfigured] = useState(false);

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
        const response = await fetch('/api/session/status', {
          cache: 'no-store',
        });
        const payload = response.ok ? await response.json().catch(() => null) : null;
        if (!active || !payload) {
          return;
        }

        setNeonConfigured(Boolean(payload.neonConfigured));

        if (payload.authenticated) {
          const target = getStoredCallbackTarget(callbackUrl);
          setRedirecting(true);
          window.location.assign(target);
          return;
        }

        if (payload.state === 'pending') {
          setInfo('Neon sign-in succeeded, but your local admin access is still pending approval.');
        } else if (payload.state === 'suspended') {
          setInfo('Your Neon identity is linked, but this local account is currently suspended.');
        } else if (payload.state === 'conflict') {
          setError('This Neon user cannot be linked automatically. Run the Neon auth audit/backfill scripts before cutting over.');
        }
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

  const handleNeonSubmit = async (event) => {
    event.preventDefault();
    setSubmittingMode('neon');
    setError('');
    setInfo('');

    const response = await fetch('/api/neon/session/sign-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callbackUrl: getStoredCallbackTarget(callbackUrl),
        email,
        password,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSubmittingMode(null);

    if (!response.ok) {
      setError(payload.error || 'Unable to sign in with Neon.');
      return;
    }

    setRedirecting(true);
    window.location.assign(normalizeProtectedPath(payload.redirectTo || '', window.location.origin) || '/admin');
  };

  const handleLegacySubmit = async () => {
    if (blockedUntil && typeof blockedUntil === 'number' && blockedUntil > Date.now()) {
      setError(`Too many attempts. Try again at ${formatRetryTime(blockedUntil)}.`);
      return;
    }

    setSubmittingMode('legacy');
    setError('');
    setInfo('');

    const safeCallback = getStoredCallbackTarget(callbackUrl);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: safeCallback,
    });

    setSubmittingMode(null);
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
    setRedirecting(true);
    window.location.assign(normalizeProtectedPath(result.url || '', window.location.origin) || safeCallback);
  };

  const isLocked = blockedUntil && typeof blockedUntil === 'number' && blockedUntil > Date.now();
  const disableInputs = Boolean(submittingMode) || redirecting || checkingSession || isLocked;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Admin Access</p>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">
          Neon auth is the primary path. The legacy local password login stays available during migration.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleNeonSubmit}>
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
          {info ? <p className="text-sm text-amber-300">{info}</p> : null}
          <Button type="submit" className="w-full" disabled={disableInputs || !neonConfigured}>
            {redirecting
              ? 'Redirecting...'
              : submittingMode === 'neon'
                ? 'Signing in with Neon...'
                : checkingSession
                  ? 'Checking session...'
                  : neonConfigured
                    ? 'Continue with Neon'
                    : 'Neon auth not configured'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800"
            disabled={disableInputs}
            onClick={handleLegacySubmit}
          >
            {submittingMode === 'legacy' ? 'Signing in with legacy auth...' : 'Use legacy password login'}
          </Button>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Existing users can keep using the legacy password flow until their Neon identity is linked.
        </p>
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

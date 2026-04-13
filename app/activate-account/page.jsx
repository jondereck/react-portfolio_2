'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

export default function ActivateAccountPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [account, setAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      if (!token || !email) {
        setError('Activation link is incomplete.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/activate-account?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
          { cache: 'no-store' },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Activation link is invalid.');
        }
        if (!cancelled) {
          setAccount(payload.user || null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Activation link is invalid.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [token, email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/activate-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          token,
          password,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to activate account.');
      }

      setSuccess('Account verified. You can now sign in.');
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to activate account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Account Activation</p>
        <h1 className="mt-3 text-3xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-400">
          Finish activation by setting your password. Only invited email addresses can create accounts.
        </p>

        {loading ? <p className="mt-6 text-sm text-slate-400">Checking activation link...</p> : null}
        {error ? <p className="mt-6 text-sm text-rose-400">{error}</p> : null}
        {success ? <p className="mt-6 text-sm text-emerald-400">{success}</p> : null}

        {!loading && !error ? (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <Input type="email" value={account?.email || email} disabled />
            <Input type="text" value={account?.role || ''} disabled />
            <Input
              type="password"
              value={password}
              placeholder="New password"
              autoComplete="new-password"
              disabled={submitting}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Input
              type="password"
              value={confirmPassword}
              placeholder="Confirm password"
              autoComplete="new-password"
              disabled={submitting}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Activating...' : 'Activate account'}
            </Button>
          </form>
        ) : null}

        <p className="mt-6 text-xs text-slate-500">
          Already verified?{' '}
          <Link href="/admin/login" className="text-cyan-300 hover:text-cyan-200">
            sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setSubmitting(false);
    if (!result || result.error) {
      setError('Invalid credentials.');
      return;
    }

    window.location.assign(result.url || callbackUrl);
  };

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
            disabled={submitting}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            value={password}
            placeholder="Password"
            autoComplete="current-password"
            disabled={submitting}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
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

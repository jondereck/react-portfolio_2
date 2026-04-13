'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to submit registration.');
      }

      setSuccess('Account request submitted. Wait for the super admin to approve it before signing in.');
      setForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Account Request</p>
        <h1 className="mt-3 text-3xl font-bold">Create an account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Submit your details and wait for a super admin to approve your account.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            value={form.name}
            placeholder="Full name"
            autoComplete="name"
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            type="email"
            value={form.email}
            placeholder="Email"
            autoComplete="email"
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <Input
            type="password"
            value={form.password}
            placeholder="Password"
            autoComplete="new-password"
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          />
          <Input
            type="password"
            value={form.confirmPassword}
            placeholder="Confirm password"
            autoComplete="new-password"
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
          />
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Request account'}
          </Button>
        </form>

        <p className="mt-6 text-xs text-slate-500">
          Already approved?{' '}
          <Link href="/admin/login" className="text-cyan-300 hover:text-cyan-200">
            sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

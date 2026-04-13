'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

export default function AdminAccountClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [account, setAccount] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  });

  useEffect(() => {
    const loadAccount = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/admin/account', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Unable to load account.');
        }

        setAccount(payload.account);
        setForm((current) => ({
          ...current,
          name: payload.account?.name || '',
          email: payload.account?.email || '',
        }));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to load account.');
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setFeedback('');

    try {
      const response = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update account.');
      }

      setAccount(payload.account);
      setForm((current) => ({
        ...current,
        name: payload.account?.name || '',
        email: payload.account?.email || '',
        currentPassword: '',
        newPassword: '',
      }));
      setFeedback(payload.account?.passwordChanged ? 'Account updated. Sign in again with your new password.' : 'Account updated.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Account</p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Manage your login</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Update your own name, email, or password here. Changing email or password requires your current password.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? <p className="text-sm text-slate-500">Loading account...</p> : null}

        {!loading && account ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Role</p>
                <p className="mt-1 text-sm font-medium uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100">
                  {account.role}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Profile</p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {account.profile?.slug || 'No profile'}
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input
                value={form.name}
                placeholder="Full name"
                disabled={saving}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                type="email"
                value={form.email}
                placeholder="Email address"
                disabled={saving}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
              <Input
                type="password"
                value={form.currentPassword}
                placeholder="Current password"
                disabled={saving}
                onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
              />
              <Input
                type="password"
                value={form.newPassword}
                placeholder="New password (leave blank to keep current)"
                disabled={saving}
                onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
              />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save account'}
                </Button>
                {feedback ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{feedback}</p> : null}
                {error ? <p className="text-sm text-rose-500">{error}</p> : null}
              </div>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}

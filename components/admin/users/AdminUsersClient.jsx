'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const formatDate = (value) => {
  if (!value) return 'Not yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not yet' : date.toLocaleString();
};

export default function AdminUsersClient() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'editor',
  });

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load users.');
      }
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create user.');
      }

      setFeedback(`Invite sent to ${payload?.invited?.email}.`);
      setForm({
        name: '',
        email: '',
        role: 'editor',
      });
      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">User Management</p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Invite a new account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Only one <code>super_admin</code> exists. New accounts must verify their real email before they can sign in.
          </p>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={handleSubmit}>
          <Input
            value={form.name}
            placeholder="Full name"
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            type="email"
            value={form.email}
            placeholder="Email address"
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <select
            value={form.role}
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="md:col-span-3 flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending invite...' : 'Create and send invite'}
            </Button>
            {feedback ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{feedback}</p> : null}
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Accounts</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Verified accounts can sign in. Invited accounts stay pending until they open the email link and set a password.
          </p>
        </div>

        {loading ? <p className="mt-4 text-sm text-slate-500">Loading users...</p> : null}

        {!loading ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Profile</th>
                  <th className="py-3 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4 text-slate-900 dark:text-slate-100">{user.name || 'Unnamed'}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                    <td className="py-3 pr-4 uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">{user.role}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          user.needsActivation
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                        }`}
                      >
                        {user.needsActivation ? 'Pending verification' : 'Verified'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{user.profile?.slug || 'No profile'}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{formatDate(user.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

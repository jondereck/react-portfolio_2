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

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    suspended: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  };

  const labels = {
    pending: 'Pending approval',
    active: 'Active',
    suspended: 'Suspended',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

export default function AdminUsersClient() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [roleDrafts, setRoleDrafts] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor',
    activateNow: true,
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
      const nextUsers = Array.isArray(payload?.users) ? payload.users : [];
      setUsers(nextUsers);
      setRoleDrafts(
        nextUsers.reduce((accumulator, user) => {
          accumulator[user.id] = user.role;
          return accumulator;
        }, {}),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const runAction = async (userId, body, successMessage) => {
    setError('');
    setFeedback('');

    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to update account.');
    }

    if (successMessage) {
      setFeedback(successMessage);
    }

    await loadUsers();
  };

  const handleManualCreate = async (event) => {
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

      setFeedback(`Created ${payload?.user?.email}.`);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'editor',
        activateNow: true,
      });
      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const promptResetPassword = async (user) => {
    const nextPassword = window.prompt(`Enter a new password for ${user.email}`);
    if (!nextPassword) return;

    try {
      await runAction(
        user.id,
        { action: 'reset_password', password: nextPassword },
        `Password updated for ${user.email}.`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to reset password.');
    }
  };

  const confirmTransferSuperAdmin = async (user) => {
    const confirmed = window.confirm(
      `Transfer super admin to ${user.email}? Your current super admin account will be downgraded to admin and signed out.`,
    );
    if (!confirmed) return;

    try {
      await runAction(
        user.id,
        { action: 'transfer_super_admin' },
        `Transferred super admin to ${user.email}. Sign in again with the new super admin account.`,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to transfer super admin.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Account Flow</p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Registration and approval</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Public users can register at <code>/register</code>. Their accounts stay pending until you approve them here.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Manual Create</p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create account directly</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This bypasses public registration. <code>super_admin</code> is not available here.
          </p>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleManualCreate}>
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
          <Input
            type="password"
            value={form.password}
            placeholder="Password"
            disabled={submitting}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
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

          <label className="md:col-span-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.activateNow}
              onChange={(event) => setForm((current) => ({ ...current, activateNow: event.target.checked }))}
            />
            Activate immediately
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create account'}
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
            Pending users are public signup requests. Approved users can be suspended, reactivated, reassigned, or reset.
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
                  <th className="py-3 pr-4 font-medium">Last login</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4 text-slate-900 dark:text-slate-100">{user.name || 'Unnamed'}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{user.email}</td>
                    <td className="py-3 pr-4">
                      {user.role === 'super_admin' ? (
                        <span className="uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">{user.role}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <select
                            value={roleDrafts[user.id] || user.role}
                            onChange={(event) =>
                              setRoleDrafts((current) => ({
                                ...current,
                                [user.id]: event.target.value,
                              }))
                            }
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs uppercase tracking-[0.12em] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          >
                            {roleOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await runAction(
                                  user.id,
                                  { action: 'change_role', role: roleDrafts[user.id] || user.role },
                                  `Updated role for ${user.email}.`,
                                );
                              } catch (requestError) {
                                setError(requestError instanceof Error ? requestError.message : 'Unable to change role.');
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{user.profile?.slug || 'No profile'}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{formatDate(user.lastLoginAt)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {user.status === 'pending' ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await runAction(
                                    user.id,
                                    { action: 'approve', role: roleDrafts[user.id] || user.role },
                                    `Approved ${user.email}.`,
                                  );
                                } catch (requestError) {
                                  setError(requestError instanceof Error ? requestError.message : 'Unable to approve account.');
                                }
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                const confirmed = window.confirm(`Reject and delete the pending account for ${user.email}?`);
                                if (!confirmed) return;
                                try {
                                  await runAction(user.id, { action: 'reject' }, `Rejected ${user.email}.`);
                                } catch (requestError) {
                                  setError(requestError instanceof Error ? requestError.message : 'Unable to reject account.');
                                }
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}

                        {user.status === 'active' && user.role !== 'super_admin' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await runAction(user.id, { action: 'suspend' }, `Suspended ${user.email}.`);
                              } catch (requestError) {
                                setError(requestError instanceof Error ? requestError.message : 'Unable to suspend account.');
                              }
                            }}
                          >
                            Suspend
                          </Button>
                        ) : null}

                        {user.status === 'suspended' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await runAction(user.id, { action: 'activate' }, `Reactivated ${user.email}.`);
                              } catch (requestError) {
                                setError(requestError instanceof Error ? requestError.message : 'Unable to reactivate account.');
                              }
                            }}
                          >
                            Reactivate
                          </Button>
                        ) : null}

                        {user.status !== 'pending' ? (
                          <Button type="button" size="sm" variant="secondary" onClick={() => promptResetPassword(user)}>
                            Reset password
                          </Button>
                        ) : null}

                        {user.canTransferSuperAdmin ? (
                          <Button type="button" size="sm" variant="ghost" onClick={() => confirmTransferSuperAdmin(user)}>
                            Transfer super admin
                          </Button>
                        ) : null}
                      </div>
                    </td>
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

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import FieldErrorText from '@/components/forms/FieldErrorText';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { clearFieldErrors, getFieldError, normalizeFormError, parseErrorResponse } from '@/lib/form-client';

export default function AdminAccountClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
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
      setFormError('');

      try {
        const response = await fetch('/api/admin/account', { cache: 'no-store' });
        if (!response.ok) {
          throw await parseErrorResponse(response, 'Unable to load account.');
        }
        const payload = await response.json().catch(() => ({}));

        setAccount(payload.account);
        setForm((current) => ({
          ...current,
          name: payload.account?.name || '',
          email: payload.account?.email || '',
        }));
      } catch (requestError) {
        const nextError = normalizeFormError(requestError, 'Unable to load account.');
        setFormError(nextError.formError);
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => clearFieldErrors(current, field));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setFieldErrors({});
    setFeedback('');

    try {
      const response = await fetch('/api/admin/account', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw await parseErrorResponse(response, 'Unable to update account.');
      }
      const payload = await response.json().catch(() => ({}));

      setAccount(payload.account);
      setForm((current) => ({
        ...current,
        name: payload.account?.name || '',
        email: payload.account?.email || '',
        currentPassword: '',
        newPassword: '',
      }));

      const successMessage = payload.account?.passwordChanged
        ? 'Account updated. Sign in again with your new password.'
        : 'Account updated.';

      setFeedback(successMessage);
      toast.success(successMessage);
    } catch (requestError) {
      const nextError = normalizeFormError(requestError, 'Unable to update account.');
      setFormError(nextError.formError);
      setFieldErrors(nextError.fieldErrors);
      toast.error(nextError.formError);
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
              <FormErrorSummary error={formError} fieldErrors={fieldErrors} />

              <div>
                <Input
                  value={form.name}
                  placeholder="Full name"
                  disabled={saving}
                  aria-invalid={Boolean(getFieldError(fieldErrors, 'name'))}
                  onChange={(event) => updateField('name', event.target.value)}
                />
                <FieldErrorText error={getFieldError(fieldErrors, 'name')} />
              </div>
              <div>
                <Input
                  type="email"
                  value={form.email}
                  placeholder="Email address"
                  disabled={saving}
                  aria-invalid={Boolean(getFieldError(fieldErrors, 'email'))}
                  onChange={(event) => updateField('email', event.target.value)}
                />
                <FieldErrorText error={getFieldError(fieldErrors, 'email')} />
              </div>
              <div>
                <Input
                  type="password"
                  value={form.currentPassword}
                  placeholder="Current password"
                  disabled={saving}
                  aria-invalid={Boolean(getFieldError(fieldErrors, 'currentPassword'))}
                  onChange={(event) => updateField('currentPassword', event.target.value)}
                />
                <FieldErrorText error={getFieldError(fieldErrors, 'currentPassword')} />
              </div>
              <div>
                <Input
                  type="password"
                  value={form.newPassword}
                  placeholder="New password (leave blank to keep current)"
                  disabled={saving}
                  aria-invalid={Boolean(getFieldError(fieldErrors, 'newPassword'))}
                  onChange={(event) => updateField('newPassword', event.target.value)}
                />
                <FieldErrorText error={getFieldError(fieldErrors, 'newPassword')} />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save account'}
                </Button>
                {feedback ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{feedback}</p> : null}
              </div>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}

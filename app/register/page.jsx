'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import FieldErrorText from '@/components/forms/FieldErrorText';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { clearFieldErrors, getFieldError, normalizeFormError, parseErrorResponse } from '@/lib/form-client';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => clearFieldErrors(current, field));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    if (form.name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      setSubmitting(false);
      return;
    }

    if (form.password.trim().length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
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

      if (!response.ok) {
        throw await parseErrorResponse(response, 'Unable to submit registration.');
      }
      const payload = await response.json().catch(() => ({}));

      setSuccess('Account request submitted. Wait for the super admin to approve it before signing in.');
      toast.success('Account request submitted.');
      setForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    } catch (requestError) {
      const nextError = normalizeFormError(requestError, 'Unable to submit registration.');
      setError(nextError.formError);
      setFieldErrors(nextError.fieldErrors);
      toast.error(nextError.formError);
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
          <FormErrorSummary error={error} fieldErrors={fieldErrors} className="border-slate-800/50 bg-slate-950/60 text-rose-200" />
          <Input
            value={form.name}
            placeholder="Full name"
            autoComplete="name"
            disabled={submitting}
            aria-invalid={Boolean(getFieldError(fieldErrors, 'name'))}
            onChange={(event) => updateField('name', event.target.value)}
          />
          <FieldErrorText error={getFieldError(fieldErrors, 'name')} />
          <Input
            type="email"
            value={form.email}
            placeholder="Email"
            autoComplete="email"
            disabled={submitting}
            aria-invalid={Boolean(getFieldError(fieldErrors, 'email'))}
            onChange={(event) => updateField('email', event.target.value)}
          />
          <FieldErrorText error={getFieldError(fieldErrors, 'email')} />
          <Input
            type="password"
            value={form.password}
            placeholder={`Password (${MIN_PASSWORD_LENGTH}+ characters)`}
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={Boolean(getFieldError(fieldErrors, 'password'))}
            onChange={(event) => updateField('password', event.target.value)}
          />
          <FieldErrorText error={getFieldError(fieldErrors, 'password')} />
          <Input
            type="password"
            value={form.confirmPassword}
            placeholder="Confirm password"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={Boolean(getFieldError(fieldErrors, 'confirmPassword'))}
            onChange={(event) => updateField('confirmPassword', event.target.value)}
          />
          <FieldErrorText error={getFieldError(fieldErrors, 'confirmPassword')} />
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

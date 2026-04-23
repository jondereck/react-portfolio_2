'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldCheck, User2 } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { toast } from 'sonner';
import { AuthDivider, AuthFooterLinks, AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';
import { normalizeProtectedPath } from '@/lib/auth/redirects';
import { cn } from '@/lib/utils';

function Notice({ tone = 'info', children }) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return <div className={cn('rounded-2xl border px-4 py-3 text-sm font-medium', styles)}>{children}</div>;
}

function AuthField({ label, icon: Icon, trailing, children }) {
  return (
    <label className="block">
      <span className="mb-2.5 block text-sm font-semibold text-slate-800">{label}</span>
      <div className="group relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-500">
          <Icon className="h-5 w-5" />
        </span>
        {children}
        {trailing ? <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div> : null}
      </div>
    </label>
  );
}

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') || '/admin/login', [searchParams]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submittingMode, setSubmittingMode] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [neonConfigured, setNeonConfigured] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const response = await fetch('/api/session/status', { cache: 'no-store' });
        const payload = response.ok ? await parseJson(response) : null;
        if (!active || !payload) {
          return;
        }

        setNeonConfigured(Boolean(payload.neonConfigured));

        if (payload.authenticated) {
          setRedirecting(true);
          window.location.assign('/admin');
          return;
        }

        if (payload.state === 'pending') {
          setSuccess('Your Neon account already exists. Wait for admin approval before accessing the workspace.');
        } else if (!payload.neonConfigured) {
          setError('Neon auth is not configured yet.');
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
  }, []);

  const disableInputs = Boolean(submittingMode) || checkingSession || redirecting;
  const primaryButtonClass =
    'h-14 w-full rounded-2xl border-0 bg-[#2563eb] text-base font-semibold text-white shadow-[0_20px_40px_-22px_rgba(37,99,235,0.9)] transition hover:bg-[#1d4ed8] disabled:bg-blue-300';
  const secondaryButtonClass =
    'h-[52px] w-full rounded-2xl border border-slate-200 bg-white text-[15px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50';
  const iconButtonClass = 'rounded-xl border border-transparent p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmittingMode('sign-up');

    const response = await fetch('/api/neon/session/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callbackUrl: normalizeProtectedPath(callbackUrl, window.location.origin) || '/admin/login',
        email: form.email,
        name: form.name,
        password: form.password,
      }),
    });

    const payload = await parseJson(response);
    setSubmittingMode(null);

    if (!response.ok) {
      const message = payload.error || 'Unable to create your account.';
      setError(message);
      toast.error(message);
      return;
    }

    const message = payload.message || 'Account created. Wait for admin approval before signing in.';
    setSuccess(message);
    toast.success('Neon account created.');
    setForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });

    window.setTimeout(() => {
      const target = normalizeProtectedPath(payload.redirectTo || '/admin/login', window.location.origin) || '/admin/login';
      window.location.assign(target);
    }, 900);
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setSuccess('');
    setSubmittingMode('google');

    const response = await fetch('/api/neon/session/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callbackUrl: normalizeProtectedPath(callbackUrl, window.location.origin) || '/admin',
        mode: 'sign-up',
      }),
    });

    const payload = await parseJson(response);
    setSubmittingMode(null);

    if (!response.ok) {
      const message = payload.error || 'Unable to start Google sign-up.';
      setError(message);
      toast.error(message);
      return;
    }

    setRedirecting(true);
    window.location.assign(payload.redirectTo);
  };

  return (
    <AuthShell
      eyebrow="Create Access"
      title="Create account"
      description="Set up a Neon identity first. Your local workspace access still stays pending until an admin approves it."
      footer={
        <AuthFooterLinks
          secondaryHref="/"
          secondaryLabel="Return home"
          primaryHref="/admin/login"
          primaryLabel="Already approved? Sign in"
        />
      }
    >
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {success ? <Notice>{success}</Notice> : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <AuthField label="Full name" icon={User2}>
            <Input
              value={form.name}
              disabled={disableInputs}
              placeholder="Enter your full name"
              autoComplete="name"
              className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px]"
              onChange={(event) => updateField('name', event.target.value)}
            />
          </AuthField>

          <AuthField label="Email address" icon={Mail}>
            <Input
              value={form.email}
              type="email"
              disabled={disableInputs}
              placeholder="Enter your email"
              autoComplete="email"
              className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px]"
              onChange={(event) => updateField('email', event.target.value)}
            />
          </AuthField>

          <AuthField
            label="Password"
            icon={Lock}
            trailing={
              <button
                type="button"
                className={iconButtonClass}
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          >
            <Input
              value={form.password}
              type={showPassword ? 'text' : 'password'}
              disabled={disableInputs}
              placeholder={`Use ${MIN_PASSWORD_LENGTH}+ characters`}
              autoComplete="new-password"
              className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-14 text-[15px]"
              onChange={(event) => updateField('password', event.target.value)}
            />
          </AuthField>

          <AuthField label="Confirm password" icon={ShieldCheck}>
            <Input
              value={form.confirmPassword}
              type={showPassword ? 'text' : 'password'}
              disabled={disableInputs}
              placeholder="Repeat your password"
              autoComplete="new-password"
              className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px]"
              onChange={(event) => updateField('confirmPassword', event.target.value)}
            />
          </AuthField>

          <Button type="submit" disabled={disableInputs || !neonConfigured} className={primaryButtonClass}>
            {submittingMode === 'sign-up' || redirecting ? (
              <>
                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : checkingSession ? (
              'Checking session...'
            ) : (
              'Create Neon Account'
            )}
          </Button>
        </form>

        <AuthDivider />

        <Button
          type="button"
          disabled={disableInputs || !neonConfigured}
          className={secondaryButtonClass}
          onClick={handleGoogleSignUp}
        >
          {submittingMode === 'google' ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <FcGoogle className="mr-2 h-5 w-5" />}
          Continue with Google
        </Button>

        <p className="text-center text-sm text-slate-500">
          Existing user?{' '}
          <Link href="/admin/login" className="font-semibold text-blue-600 transition hover:text-blue-700">
            Go to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

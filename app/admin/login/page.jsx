'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Lock,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { AuthDivider, AuthFooterLinks, AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeProtectedPath } from '@/lib/auth/redirects';
import { cn } from '@/lib/utils';

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

async function parseJson(response) {
  return response.json().catch(() => ({}));
}

function Notice({ tone = 'info', children }) {
  const styles =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';

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

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get('callbackUrl') || '/admin', [searchParams]);

  const [mode, setMode] = useState('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [codeEmail, setCodeEmail] = useState('');
  const [codeOtp, setCodeOtp] = useState('');
  const [codeStep, setCodeStep] = useState('request');

  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetStep, setResetStep] = useState('request');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submittingMode, setSubmittingMode] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [neonConfigured, setNeonConfigured] = useState(false);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const response = await fetch('/api/session/status', {
          cache: 'no-store',
        });
        const payload = response.ok ? await parseJson(response) : null;
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
          setInfo('Your Neon account is connected, but your local workspace access is still waiting for admin approval.');
        } else if (payload.state === 'suspended') {
          setInfo('Your Neon identity is linked, but this local account is currently suspended.');
        } else if (payload.state === 'conflict') {
          setError('This Neon user cannot be linked automatically. Run the Neon audit/backfill flow before using this login.');
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
  }, [callbackUrl]);

  const disableInputs = Boolean(submittingMode) || redirecting || checkingSession;

  const clearMessages = () => {
    setError('');
    setInfo('');
  };

  const syncEmailPrefill = (nextMode) => {
    const trimmedIdentifier = identifier.trim();
    if (nextMode !== 'password' && trimmedIdentifier.includes('@') && !codeEmail) {
      setCodeEmail(trimmedIdentifier);
    }
    if (nextMode === 'reset' && trimmedIdentifier.includes('@') && !resetEmail) {
      setResetEmail(trimmedIdentifier);
    }
  };

  const switchMode = (nextMode) => {
    clearMessages();
    syncEmailPrefill(nextMode);
    setMode(nextMode);
  };

  const startRedirect = (target, options = {}) => {
    const { allowExternal = false } = options;
    setRedirecting(true);

    if (allowExternal) {
      try {
        const resolved = new URL(target, window.location.origin);
        if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
          window.location.assign(resolved.toString());
          return;
        }
      } catch {
        // Fall back to protected internal routes if the OAuth target is malformed.
      }
    }

    window.location.assign(normalizeProtectedPath(target || '', window.location.origin) || '/admin');
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    clearMessages();
    setSubmittingMode('password');

    const response = await fetch('/api/neon/session/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callbackUrl: getStoredCallbackTarget(callbackUrl),
        identifier,
        password,
        rememberMe,
      }),
    });

    const payload = await parseJson(response);
    setSubmittingMode(null);

    if (!response.ok) {
      setError(payload.error || 'Unable to sign in.');
      return;
    }

    startRedirect(payload.redirectTo);
  };

  const handleGoogle = async (flowMode = 'sign-in') => {
    clearMessages();
    setSubmittingMode('google');

    const response = await fetch('/api/neon/session/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callbackUrl: getStoredCallbackTarget(callbackUrl),
        mode: flowMode,
      }),
    });

    const payload = await parseJson(response);
    setSubmittingMode(null);

    if (!response.ok) {
      setError(payload.error || 'Unable to start Google sign-in.');
      return;
    }

    startRedirect(payload.redirectTo, { allowExternal: true });
  };

  const requestSignInCode = async () => {
    clearMessages();
    setSubmittingMode('send-code');

    const response = await fetch('/api/neon/session/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: codeEmail }),
    });

    const payload = await parseJson(response);
    setSubmittingMode(null);

    if (!response.ok) {
      setError(payload.error || 'Unable to send a sign-in code.');
      return false;
    }

    setCodeStep('verify');
    setInfo(payload.message || 'Check your email for the sign-in code.');
    return true;
  };

  const handleSendCode = async (event) => {
    event.preventDefault();
    await requestSignInCode();
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    clearMessages();
    setSubmittingMode('verify-code');

    const response = await fetch('/api/neon/session/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callbackUrl: getStoredCallbackTarget(callbackUrl),
        email: codeEmail,
        otp: codeOtp,
      }),
    });

    const payload = await parseJson(response);
    setSubmittingMode(null);

    if (!response.ok) {
      setError(payload.error || 'Unable to verify that sign-in code.');
      return;
    }

    startRedirect(payload.redirectTo);
  };

  const requestPasswordResetCode = async () => {
    clearMessages();
    setSubmittingMode('forgot-password');

    const response = await fetch('/api/neon/session/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetEmail }),
    });

    const payload = await parseJson(response);
    setSubmittingMode(null);

    if (!response.ok) {
      setError(payload.error || 'Unable to send a reset code.');
      return false;
    }

    setResetStep('verify');
    setInfo(payload.message || 'If that email exists, a reset code has been sent.');
    return true;
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    await requestPasswordResetCode();
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    clearMessages();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmittingMode('reset-password');

    const response = await fetch('/api/neon/session/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetEmail,
        otp: resetOtp,
        password: newPassword,
      }),
    });

    const payload = await parseJson(response);
    setSubmittingMode(null);

    if (!response.ok) {
      setError(payload.error || 'Unable to reset your password.');
      return;
    }

    setInfo(payload.message || 'Password updated. You can sign in now.');
    setMode('password');
    setResetStep('request');
    setIdentifier(resetEmail);
    setPassword('');
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const primaryButtonClass =
    'h-14 w-full rounded-2xl border-0 bg-[#2563eb] text-base font-semibold text-white shadow-[0_20px_40px_-22px_rgba(37,99,235,0.9)] transition hover:bg-[#1d4ed8] disabled:bg-blue-300';
  const secondaryButtonClass =
    'h-[52px] w-full rounded-2xl border border-slate-200 bg-white text-[15px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50';
  const iconButtonClass = 'rounded-xl border border-transparent p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';

  return (
    <AuthShell
      eyebrow="Admin Access"
      title="Welcome back"
      description="Sign in to your workspace with Neon password, Google, or an email code."
      footer={
        <AuthFooterLinks
          secondaryHref="/"
          secondaryLabel="Return home"
          primaryHref="/register"
          primaryLabel="Need an account? Sign up"
        />
      }
    >
      <div className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {info ? <Notice>{info}</Notice> : null}

        {mode === 'password' ? (
          <form className="space-y-5" onSubmit={handlePasswordSubmit}>
            <AuthField label="Email or Username" icon={Mail}>
              <Input
                value={identifier}
                disabled={disableInputs}
                placeholder="Enter your email or username"
                autoComplete="username"
                className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                onChange={(event) => setIdentifier(event.target.value)}
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
                value={password}
                disabled={disableInputs}
                placeholder="Enter your password"
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-14 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                onChange={(event) => setPassword(event.target.value)}
              />
            </AuthField>

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-3 text-slate-500">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={disableInputs}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                disabled={disableInputs}
                className="font-semibold text-blue-600 transition hover:text-blue-700 disabled:text-slate-400"
                onClick={() => {
                  setResetEmail(identifier.includes('@') ? identifier : resetEmail);
                  switchMode('reset');
                }}
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" disabled={disableInputs || !neonConfigured} className={primaryButtonClass}>
              {submittingMode === 'password' || redirecting ? (
                <>
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : checkingSession ? (
                'Checking session...'
              ) : (
                <>
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>

            <AuthDivider />

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                disabled={disableInputs || !neonConfigured}
                className={secondaryButtonClass}
                onClick={() => handleGoogle('sign-in')}
              >
                {submittingMode === 'google' ? <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> : <FcGoogle className="mr-2 h-5 w-5" />}
                Continue with Google
              </Button>
              <Button
                type="button"
                disabled={disableInputs || !neonConfigured}
                className={secondaryButtonClass}
                onClick={() => switchMode('code')}
              >
                <KeyRound className="mr-2 h-4 w-4 text-blue-600" />
                Sign in with email code
              </Button>
            </div>
          </form>
        ) : null}

        {mode === 'code' ? (
          <form className="space-y-5" onSubmit={codeStep === 'request' ? handleSendCode : handleVerifyCode}>
            <AuthField label="Email address" icon={Mail}>
              <Input
                value={codeEmail}
                disabled={disableInputs || codeStep === 'verify'}
                placeholder="Enter your email"
                autoComplete="email"
                className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px]"
                onChange={(event) => setCodeEmail(event.target.value)}
              />
            </AuthField>

            {codeStep === 'verify' ? (
              <AuthField label="Verification code" icon={KeyRound}>
                <Input
                  value={codeOtp}
                  disabled={disableInputs}
                  placeholder="Enter the code from your email"
                  inputMode="numeric"
                  className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px] tracking-[0.35em]"
                  onChange={(event) => setCodeOtp(event.target.value)}
                />
              </AuthField>
            ) : null}

            <Button type="submit" disabled={disableInputs || !neonConfigured} className={primaryButtonClass}>
              {submittingMode === 'send-code' || submittingMode === 'verify-code' ? (
                <>
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  {codeStep === 'request' ? 'Sending code...' : 'Verifying code...'}
                </>
              ) : codeStep === 'request' ? (
                'Send Code'
              ) : (
                'Sign In With Code'
              )}
            </Button>

            <AuthDivider />

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                disabled={disableInputs || !neonConfigured}
                className={secondaryButtonClass}
                onClick={() => handleGoogle('sign-in')}
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>
              <Button
                type="button"
                disabled={disableInputs}
                className={secondaryButtonClass}
                onClick={() => switchMode('password')}
              >
                <Lock className="mr-2 h-4 w-4 text-blue-600" />
                Use password instead
              </Button>
            </div>

            {codeStep === 'verify' ? (
              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={disableInputs}
                  className="inline-flex items-center gap-2 font-semibold text-slate-500 transition hover:text-slate-900 disabled:text-slate-300"
                  onClick={() => {
                    setCodeStep('request');
                    setCodeOtp('');
                    clearMessages();
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change email
                </button>
                <button
                  type="button"
                  disabled={disableInputs}
                  className="inline-flex items-center gap-2 font-semibold text-blue-600 transition hover:text-blue-700 disabled:text-slate-300"
                  onClick={requestSignInCode}
                >
                  <RefreshCw className="h-4 w-4" />
                  Resend code
                </button>
              </div>
            ) : null}
          </form>
        ) : null}

        {mode === 'reset' ? (
          <form className="space-y-5" onSubmit={resetStep === 'request' ? handleForgotPassword : handleResetPassword}>
            <AuthField label="Email address" icon={Mail}>
              <Input
                value={resetEmail}
                disabled={disableInputs || resetStep === 'verify'}
                placeholder="Enter your email"
                autoComplete="email"
                className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px]"
                onChange={(event) => setResetEmail(event.target.value)}
              />
            </AuthField>

            {resetStep === 'verify' ? (
              <>
                <AuthField label="Reset code" icon={KeyRound}>
                  <Input
                    value={resetOtp}
                    disabled={disableInputs}
                    placeholder="Enter the code from your email"
                    inputMode="numeric"
                    className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px] tracking-[0.35em]"
                    onChange={(event) => setResetOtp(event.target.value)}
                  />
                </AuthField>

                <AuthField
                  label="New password"
                  icon={Lock}
                  trailing={
                    <button
                      type="button"
                      className={iconButtonClass}
                      onClick={() => setShowResetPassword((value) => !value)}
                      aria-label={showResetPassword ? 'Hide new password' : 'Show new password'}
                    >
                      {showResetPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  }
                >
                  <Input
                    value={newPassword}
                    disabled={disableInputs}
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Create a new password"
                    autoComplete="new-password"
                    className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-14 text-[15px]"
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </AuthField>

                <AuthField label="Confirm password" icon={Lock}>
                  <Input
                    value={confirmPassword}
                    disabled={disableInputs}
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                    className="h-16 rounded-3xl border-slate-200 bg-slate-50/70 pl-12 pr-4 text-[15px]"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </AuthField>
              </>
            ) : null}

            <Button type="submit" disabled={disableInputs || !neonConfigured} className={primaryButtonClass}>
              {submittingMode === 'forgot-password' || submittingMode === 'reset-password' ? (
                <>
                  <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                  {resetStep === 'request' ? 'Sending reset code...' : 'Updating password...'}
                </>
              ) : resetStep === 'request' ? (
                'Send Reset Code'
              ) : (
                'Update Password'
              )}
            </Button>

            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                disabled={disableInputs}
                className="inline-flex items-center gap-2 font-semibold text-slate-500 transition hover:text-slate-900 disabled:text-slate-300"
                onClick={() => {
                  setMode('password');
                  setResetStep('request');
                  clearMessages();
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>

              {resetStep === 'verify' ? (
                <button
                  type="button"
                  disabled={disableInputs}
                  className="inline-flex items-center gap-2 font-semibold text-blue-600 transition hover:text-blue-700 disabled:text-slate-300"
                  onClick={requestPasswordResetCode}
                >
                  <RefreshCw className="h-4 w-4" />
                  Resend code
                </button>
              ) : null}
            </div>
          </form>
        ) : null}

        <p className="text-center text-sm text-slate-500">
          New to the workspace?{' '}
          <Link href="/register" className="font-semibold text-blue-600 transition hover:text-blue-700">
            Create your Neon account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

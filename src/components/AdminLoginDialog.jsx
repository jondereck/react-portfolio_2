import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

const AdminLoginDialog = ({ open, onOpenChange }) => {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!blockedUntil || typeof blockedUntil !== 'number') {
      return;
    }

    const tick = () => {
      if (Date.now() >= blockedUntil) {
        setBlockedUntil(null);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [blockedUntil]);

  const formatRetryTime = (epochMs) => new Date(epochMs).toLocaleString();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedKey = key.trim();

    if (normalizedKey.length === 0) {
      setError('Admin key is required');
      return;
    }

    if (blockedUntil && typeof blockedUntil === 'number' && blockedUntil > Date.now()) {
      setError(`Too many attempts. Try again at ${formatRetryTime(blockedUntil)}.`);
      return;
    }

    setSubmitting(true);
    let authenticated = false;
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: normalizedKey }),
      });

      if (!response.ok) {
        let payload = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }

        const apiError = payload && typeof payload.error === 'string' ? payload.error : null;
        const nextBlockedUntil =
          payload &&
          payload.rateLimit &&
          typeof payload.rateLimit.blockedUntil === 'number' &&
          payload.rateLimit.blockedUntil > 0
            ? payload.rateLimit.blockedUntil
            : null;

        if (nextBlockedUntil) {
          setBlockedUntil(nextBlockedUntil);
          setError(`Too many attempts. Try again at ${formatRetryTime(nextBlockedUntil)}.`);
        } else {
          setError(apiError || 'Invalid credentials');
        }
        return;
      }

      authenticated = true;
    } catch {
      setError('Unable to validate credentials');
    } finally {
      setSubmitting(false);
    }

    if (!authenticated) {
      return;
    }

    setKey('');
    setError('');
    setBlockedUntil(null);
    onOpenChange(false);
    router.push('/admin');
  };

  const isLocked = blockedUntil && typeof blockedUntil === 'number' && blockedUntil > Date.now();

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setKey('');
          setError('');
          setBlockedUntil(null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Admin Login</DialogTitle>
          <DialogDescription>Enter your admin key to access the admin dashboard.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            placeholder="Enter admin key"
            value={key}
            autoFocus
            disabled={submitting || isLocked}
            onChange={(event) => {
              setKey(event.target.value);
              if (error) {
                setError('');
              }
            }}
          />
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting || isLocked}>
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Logging in...
              </span>
            ) : (
              'Login'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLoginDialog;

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

const AdminLoginDialog = ({ open, onOpenChange }) => {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedKey = key.trim();

    if (normalizedKey.length === 0) {
      setError('Admin key is required');
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
        setError('Invalid credentials');
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
    onOpenChange(false);
    router.push('/admin');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setKey('');
          setError('');
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
            disabled={submitting}
            onChange={(event) => {
              setKey(event.target.value);
              if (error) {
                setError('');
              }
            }}
          />
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={submitting}>
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

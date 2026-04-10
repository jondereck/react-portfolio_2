import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

const AdminLoginDialog = ({ open, onOpenChange }) => {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedKey = key.trim();

    if (normalizedKey.length === 0) {
      setError('Admin key is required');
      return;
    }

    try {
      const response = await fetch('/api/admin/verify', {
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
    } catch {
      setError('Unable to validate credentials');
      return;
    }

    localStorage.setItem('admin-auth', 'true');
    localStorage.setItem('admin-key', normalizedKey);
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
            onChange={(event) => {
              setKey(event.target.value);
              if (error) {
                setError('');
              }
            }}
          />
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminLoginDialog;

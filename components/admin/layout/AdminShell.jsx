'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/navigation/AdminSidebar';
import AdminTopbar from '@/components/admin/layout/AdminTopbar';
import GlobalLoader from '@/components/GlobalLoader';

export default function AdminShell({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      try {
        const response = await fetch('/api/admin/verify', { cache: 'no-store' });

        if (!response.ok) {
          router.replace('/');
          return;
        }

        if (mounted) {
          setReady(true);
        }
      } catch {
        router.replace('/');
      }
    };

    verifySession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    router.push('/');
  };

  if (!ready) {
    return <GlobalLoader forceVisible message="Checking admin session" hint="Preparing the control center." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-[1640px] space-y-6">
        <AdminTopbar onLogout={handleLogout} />
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="hidden lg:block">
            <AdminSidebar />
          </div>
          <main className="min-w-0 flex-1 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

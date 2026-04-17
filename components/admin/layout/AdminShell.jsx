'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/navigation/AdminSidebar';
import AdminTopbar from '@/components/admin/layout/AdminTopbar';
import { useLoadingStore } from '@/store/loading';

const adminLastVisitedPathStorageKey = 'admin:lastVisitedPath';

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const startGlobalLoading = useLoadingStore((state) => state.startLoading);
  const stopGlobalLoading = useLoadingStore((state) => state.stopLoading);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pathname || pathname === '/admin/login') return;
    if (!pathname.startsWith('/admin')) return;
    window.localStorage.setItem(adminLastVisitedPathStorageKey, pathname);
  }, [pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    startGlobalLoading('Signing out from admin');

    try {
      await signOut({ callbackUrl: '/admin/login' });
    } finally {
      stopGlobalLoading();
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-[1640px] space-y-6">
        <AdminTopbar onLogout={handleLogout} isLoggingOut={isLoggingOut} />
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

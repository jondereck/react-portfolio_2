'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/navigation/AdminSidebar';
import AdminTopbar from '@/components/admin/layout/AdminTopbar';
import { useLoadingStore } from '@/store/loading';
import UnclothyTaskNotifier from '@/components/admin/layout/UnclothyTaskNotifier';

const adminLastVisitedPathStorageKey = 'admin:lastVisitedPath';
const authLastVisitedPathStorageKey = 'auth:lastVisitedPath';
const sidebarCollapsedStorageKey = 'admin:sidebarCollapsed';

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const startGlobalLoading = useLoadingStore((state) => state.startLoading);
  const stopGlobalLoading = useLoadingStore((state) => state.stopLoading);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(sidebarCollapsedStorageKey) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!pathname || pathname === '/admin/login') return;
    if (!pathname.startsWith('/admin')) return;
    window.localStorage.setItem(adminLastVisitedPathStorageKey, pathname);
    window.localStorage.setItem(authLastVisitedPathStorageKey, pathname);
  }, [pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    startGlobalLoading('Signing out from admin');

    try {
      await fetch('/api/neon/session/sign-out', {
        method: 'POST',
      }).catch(() => null);
      await signOut({ callbackUrl: '/admin/login' });
    } finally {
      stopGlobalLoading();
      setIsLoggingOut(false);
    }
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(sidebarCollapsedStorageKey, next ? '1' : '0');
      } catch {
        // ignore persistence errors
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <UnclothyTaskNotifier />
      <div className="flex min-h-screen items-stretch">
        <div className="sticky top-0 hidden h-screen self-stretch lg:block">
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggle={handleToggleSidebar}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
          />
        </div>

        <div className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-[1640px] space-y-6">
            <AdminTopbar
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
            />
            <main className="min-w-0 flex-1 space-y-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

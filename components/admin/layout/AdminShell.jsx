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
const accountNameStorageKey = 'admin:accountDisplayName';

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const startGlobalLoading = useLoadingStore((state) => state.startLoading);
  const stopGlobalLoading = useLoadingStore((state) => state.stopLoading);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [accountName, setAccountName] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(accountNameStorageKey) || '';
    } catch {
      return '';
    }
  });
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const controller = new AbortController();

    const loadAccount = async () => {
      try {
        const response = await fetch('/api/admin/account', {
          method: 'GET',
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Account request failed');
        }

        const payload = await response.json().catch(() => ({}));
        const account = payload?.account ?? null;
        const resolvedName = String(account?.name || account?.email || '').trim();
        if (!resolvedName) {
          return;
        }

        setAccountName(resolvedName);
        try {
          window.localStorage.setItem(accountNameStorageKey, resolvedName);
        } catch {
          // ignore persistence errors
        }
      } catch {
        // ignore account refresh errors and keep the last known label
      }
    };

    void loadAccount();

    return () => controller.abort();
  }, []);

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
            accountName={accountName}
          />
        </div>

        <div className="min-w-0 flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-[1640px] space-y-6">
            <AdminTopbar
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
              accountName={accountName}
            />
            <main className="min-w-0 flex-1 space-y-6">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { signOut } from 'next-auth/react';
import AdminSidebar from '@/components/admin/navigation/AdminSidebar';
import AdminTopbar from '@/components/admin/layout/AdminTopbar';

export default function AdminShell({ children }) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' });
  };

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

'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import AdminBreadcrumbs from '@/components/admin/layout/AdminBreadcrumbs';

const pageTitles = {
  '/admin': 'Admin Dashboard',
  '/admin/portfolio': 'Portfolio Administration',
  '/admin/portfolio/manage': 'Portfolio Workspace',
  '/admin/portfolio/projects': 'Projects Administration',
  '/admin/portfolio/skills': 'Skills Administration',
  '/admin/portfolio/certificates': 'Certificates Administration',
  '/admin/portfolio/homepage': 'Homepage Administration',
  '/admin/gallery': 'Gallery Administration',
  '/admin/gallery/workspace': 'Gallery Workspace',
  '/admin/gallery/manage': 'Album Management',
  '/admin/gallery/albums': 'Album Management',
  '/admin/gallery/media': 'Media Management',
  '/admin/gallery/arrange': 'Media Arrangement',
  '/admin/gallery/import': 'Media Import',
  '/admin/gallery/settings': 'Gallery Settings',
  '/admin/settings': 'System Settings',
};

export default function AdminTopbar({ onLogout }) {
  const pathname = usePathname();

  const title = useMemo(() => pageTitles[pathname] ?? 'Admin Control Center', [pathname]);

  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Control Center</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
          <AdminBreadcrumbs />
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

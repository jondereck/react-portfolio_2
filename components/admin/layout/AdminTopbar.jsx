'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog, Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { LayoutPanelLeft, LogOut, Menu as MenuIcon, User, X } from 'lucide-react';
import AdminBreadcrumbs from '@/components/admin/layout/AdminBreadcrumbs';
import { adminNavigationSections } from '@/components/admin/navigation/admin-nav-config';

const pageTitles = {
  '/admin': 'Admin Dashboard',
  '/admin/portfolio': 'Portfolio Administration',
  '/admin/portfolio/manage': 'Portfolio Workspace',
  '/admin/portfolio/projects': 'Projects Administration',
  '/admin/portfolio/skills': 'Skills Administration',
  '/admin/portfolio/certificates': 'Certificates Administration',
  '/admin/portfolio/homepage': 'Homepage Administration',
  '/admin/portfolio/experience': 'Experience Administration',
  '/admin/gallery': 'Gallery Administration',
  '/admin/gallery/workspace': 'Gallery Workspace',
  '/admin/gallery/manage': 'Album Management',
  '/admin/gallery/albums': 'Album Management',
  '/admin/gallery/media': 'Media Management',
  '/admin/gallery/arrange': 'Media Arrangement',
  '/admin/gallery/import': 'Media Import',
  '/admin/account': 'My Account',
  '/admin/settings': 'Site Settings',
  '/admin/navigation': 'Navigation Settings',
  '/admin/integrations': 'Integrations',
  '/admin/security': 'Security & Access',
  '/admin/users': 'User Management',
};

export default function AdminTopbar({ onLogout, isLoggingOut = false, sidebarCollapsed = false, onToggleSidebar }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [accountName, setAccountName] = useState('My Account');
  const [accountLoading, setAccountLoading] = useState(true);

  const title = useMemo(() => pageTitles[pathname] ?? 'Admin Control Center', [pathname]);

  const isActivePath = (href) => {
    if (href.includes('#')) {
      return pathname === href.split('#')[0];
    }

    if (href === '/admin') {
      return pathname === '/admin';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const controller = new AbortController();

    const load = async () => {
      setAccountLoading(true);
      try {
        const response = await fetch('/api/admin/account', { method: 'GET', signal: controller.signal });
        if (!response.ok) {
          throw new Error('Account request failed');
        }

        const payload = await response.json().catch(() => ({}));
        const account = payload?.account ?? null;
        const resolvedName = String(account?.name || account?.email || '').trim();
        setAccountName(resolvedName || 'My Account');
      } catch {
        setAccountName('My Account');
      } finally {
        setAccountLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, []);

  return (
    <>
      <header className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm md:p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Control Center</p>
              <h1 className="text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">{title}</h1>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <HeadlessMenu as="div" className="relative">
                <HeadlessMenu.Button
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Account menu"
                  title="Account"
                >
                  <span className="text-xs font-semibold">
                    {String(accountName || 'A').trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                </HeadlessMenu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-120"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-90"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                >
                  <HeadlessMenu.Items className="absolute right-0 top-full z-[9999] mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {accountLoading ? 'Loading...' : accountName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Online</p>
                    </div>
                    <div className="p-2">
                      <HeadlessMenu.Item>
                        {({ active }) => (
                          <Link
                            href="/admin/account"
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                              active
                                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <User className="size-4" />
                            Manage account
                          </Link>
                        )}
                      </HeadlessMenu.Item>

                      <HeadlessMenu.Item disabled={!onLogout || isLoggingOut}>
                        {({ active, disabled }) => (
                          <button
                            type="button"
                            onClick={() => onLogout?.()}
                            disabled={disabled}
                            className={`mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                              active
                                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                                : 'text-slate-700 dark:text-slate-200'
                            } ${disabled ? 'opacity-60' : ''}`}
                          >
                            <LogOut className="size-4" />
                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                          </button>
                        )}
                      </HeadlessMenu.Item>
                    </div>
                  </HeadlessMenu.Items>
                </Transition>
              </HeadlessMenu>

              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Open menu"
                title="Open menu"
              >
                <MenuIcon className="size-5" />
              </button>
            </div>
          </div>

          <div className="pt-0.5">
            <AdminBreadcrumbs />
          </div>
        </div>

        <div className="hidden md:flex md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Control Center</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            <div>
              <AdminBreadcrumbs />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {onToggleSidebar ? (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="hidden h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:inline-flex"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <LayoutPanelLeft className="size-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <Transition show={isMenuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={setIsMenuOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-end justify-center p-3">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-4"
            >
              <Dialog.Panel className="flex max-h-[min(44rem,calc(100dvh-1.5rem))] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin Control Center</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Portfolio CMS</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Open a section without forcing the desktop sidebar onto mobile.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <nav className="space-y-5">
                    {adminNavigationSections.map((section) => (
                      <section key={section.title} className="space-y-2">
                        <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {section.items.map((item) => {
                            const active = isActivePath(item.href);

                            return (
                              <Link
                                key={item.href + item.label}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`min-h-16 rounded-xl px-3 py-3 text-sm transition ${
                                  active
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="block text-sm font-medium leading-5">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </nav>
                </div>
                <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout();
                    }}
                    disabled={isLoggingOut}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

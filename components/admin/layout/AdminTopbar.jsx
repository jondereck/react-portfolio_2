'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useMemo, useState } from 'react';
import { ArrowLeft, LogOut, Menu, User, X } from 'lucide-react';
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

export default function AdminTopbar({ onLogout, isLoggingOut = false, sidebarCollapsed = false, onToggleSidebar, accountName = '' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const title = useMemo(() => pageTitles[pathname] ?? 'Admin Control Center', [pathname]);
  const canGoBack = useMemo(() => pathname !== '/admin' && pathname !== '/admin/login', [pathname]);
  const resolvedAccountName = String(accountName || '').trim();
  const accountInitial = resolvedAccountName.slice(0, 1).toUpperCase();

  const isActivePath = (href) => {
    if (href.includes('#')) {
      return pathname === href.split('#')[0];
    }

    if (href === '/admin') {
      return pathname === '/admin';
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm md:p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                {canGoBack ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.history.length > 1) {
                        router.back();
                        return;
                      }
                      router.push('/admin');
                    }}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    aria-label="Go back"
                    title="Go back"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                ) : null}

                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Control Center</p>
              </div>
              <h1 className="text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">{title}</h1>
            </div>

            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Open admin menu"
              title="Open admin menu"
            >
              {accountInitial ? <span className="text-sm font-semibold">{accountInitial}</span> : <User className="size-4" />}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
            </button>
          </div>
        </div>

        <div className="hidden md:flex md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {canGoBack ? (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.history.length > 1) {
                      router.back();
                      return;
                    }
                    router.push('/admin');
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Go back"
                  title="Go back"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : null}

              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Control Center</p>
            </div>
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
                <Menu className="size-5" />
              </button>
            ) : null}
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
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm dark:bg-slate-50 dark:text-slate-900">
                        {accountInitial ? <span className="text-sm font-semibold">{accountInitial}</span> : <User className="size-5" />}
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                      </div>

                      <div className="mt-3 min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{resolvedAccountName || 'Account'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Account</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                        href="/admin/account"
                        onClick={() => setIsMenuOpen(false)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <User className="size-4" />
                        Manage account
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onLogout?.();
                        }}
                        disabled={!onLogout || isLoggingOut}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <LogOut className="size-4" />
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

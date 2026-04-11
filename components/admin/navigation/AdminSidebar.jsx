'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavigationSections } from '@/components/admin/navigation/admin-nav-config';

function isActivePath(pathname, href) {
  if (href.includes('#')) {
    return pathname === href.split('#')[0];
  }

  if (href === '/admin') {
    return pathname === '/admin';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-72 lg:overflow-y-auto dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin Control Center</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Portfolio CMS</h2>
      </div>

      <nav className="space-y-5">
        {adminNavigationSections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.title}</h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={`block rounded-md px-2 py-1.5 text-sm transition ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}

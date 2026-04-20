'use client';

import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  FolderOpen,
  Images,
  LayoutDashboard,
  Map,
  Plug,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
} from 'lucide-react';

const iconMap = {
  layoutDashboard: LayoutDashboard,
  folderOpen: FolderOpen,
  images: Images,
  user: User,
  settings: Settings,
  users: Users,
  map: Map,
  plug: Plug,
  shield: Shield,
  sparkles: Sparkles,
  compass: Compass,
};

export default function CollapsibleSidebar({
  collapsed,
  onToggle,
  brandKicker,
  brandTitle,
  sections,
  pathname,
  isActivePath,
}) {
  return (
    <aside
      className={`h-screen shrink-0 border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
        collapsed ? 'w-[88px]' : 'w-[290px]'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className={`${collapsed ? 'hidden' : 'block'} min-w-0`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{brandKicker}</p>
            <h2 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-slate-100">{brandTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h3
                  className={`px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                    collapsed ? 'hidden' : 'block'
                  }`}
                >
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const Icon = iconMap[item.iconKey] ?? Compass;

                    return (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                          active
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        } ${collapsed ? 'justify-center px-2' : ''}`}
                      >
                        <Icon className="size-[18px] shrink-0" />
                        <span className={`${collapsed ? 'hidden' : 'block'} truncate`}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}


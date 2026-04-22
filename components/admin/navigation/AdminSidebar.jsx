'use client';

import { usePathname } from 'next/navigation';
import { adminNavigationSections } from '@/components/admin/navigation/admin-nav-config';
import CollapsibleSidebar from '@/components/admin/navigation/CollapsibleSidebar';

function isActivePath(pathname, href) {
  if (href.includes('#')) {
    return pathname === href.split('#')[0];
  }

  if (href === '/admin') {
    return pathname === '/admin';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebar({ collapsed = false, onToggle, onLogout, isLoggingOut = false }) {
  const pathname = usePathname();

  return (
    <CollapsibleSidebar
      collapsed={collapsed}
      onToggle={onToggle}
      brandKicker="Admin Control Center"
      brandTitle="Portfolio CMS"
      sections={adminNavigationSections}
      pathname={pathname}
      isActivePath={isActivePath}
      onLogout={onLogout}
      isLoggingOut={isLoggingOut}
    />
  );
}

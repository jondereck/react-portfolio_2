'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const LAST_ROUTE_KEY = 'portfolio:last-route';
const RESTORE_GUARD_KEY = 'portfolio:restore-timeOrigin';

const getNavigationType = () => {
  if (typeof window === 'undefined') {
    return 'navigate';
  }

  try {
    const perf = window.performance;
    if (perf && typeof perf.getEntriesByType === 'function') {
      const entry = perf.getEntriesByType('navigation')?.[0];
      if (entry && typeof entry.type === 'string') {
        return entry.type;
      }
    }
  } catch {
    // Ignore.
  }

  const legacyType = window.performance?.navigation?.type;
  if (legacyType === 1) {
    return 'reload';
  }
  if (legacyType === 2) {
    return 'back_forward';
  }

  return 'navigate';
};

const isSafeInternalPath = (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//');
const isPersistentRoute = (value) => {
  if (!isSafeInternalPath(value)) {
    return false;
  }

  return !value.startsWith('/api') && !value.startsWith('/register');
};
const isProtectedRoute = (value) => isSafeInternalPath(value) && value.startsWith('/admin');

export default function PwaRoutePersistence() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saveCurrentLocation = () => {
      const currentPath = `${window.location.pathname}${window.location.search || ''}`;
      if (!isPersistentRoute(currentPath) || currentPath === '/') {
        return;
      }

      window.localStorage.setItem(LAST_ROUTE_KEY, currentPath);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentLocation();
      }
    };

    window.addEventListener('pagehide', saveCurrentLocation);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pagehide', saveCurrentLocation);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const search = typeof searchParams?.toString === 'function' ? searchParams.toString() : '';
    const currentPath = `${pathname || ''}${search ? `?${search}` : ''}`;
    if (!isPersistentRoute(currentPath) || currentPath === '/') {
      return;
    }

    window.localStorage.setItem(LAST_ROUTE_KEY, currentPath);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const tryRestore = async () => {
      const currentPath = `${window.location.pathname}${window.location.search || ''}`;
      if (window.location.pathname !== '/') {
        return;
      }

      const lastRoute = window.localStorage.getItem(LAST_ROUTE_KEY);
      if (!isPersistentRoute(lastRoute)) {
        return;
      }

      if (lastRoute === '/' || lastRoute === currentPath) {
        return;
      }

      const navType = getNavigationType();
      if (navType !== 'navigate' && navType !== 'reload') {
        return;
      }

      const perf = window.performance;
      const timeOrigin = String(perf?.timeOrigin ?? perf?.timing?.navigationStart ?? 0);
      if (window.sessionStorage.getItem(RESTORE_GUARD_KEY) === timeOrigin) {
        return;
      }

      if (isProtectedRoute(lastRoute)) {
        try {
          const response = await fetch('/api/session/status', { cache: 'no-store' });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload?.authenticated) {
            window.localStorage.removeItem(LAST_ROUTE_KEY);
            return;
          }
        } catch {
          window.localStorage.removeItem(LAST_ROUTE_KEY);
          return;
        }
      }

      window.sessionStorage.setItem(RESTORE_GUARD_KEY, timeOrigin);
      router.replace(lastRoute);
    };

    void tryRestore();
  }, [router]);

  return null;
}

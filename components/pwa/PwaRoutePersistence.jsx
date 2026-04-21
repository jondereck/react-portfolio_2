'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const LAST_ROUTE_KEY = 'portfolio:last-route';
const DID_RESTORE_KEY = 'portfolio:did-restore';

const isStandaloneDisplay = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
};

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

export default function PwaRoutePersistence() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const saveCurrentLocation = () => {
      const currentPath = `${window.location.pathname}${window.location.search || ''}`;
      if (!isSafeInternalPath(currentPath)) {
        return;
      }

      window.localStorage.setItem(LAST_ROUTE_KEY, currentPath);
    };

    saveCurrentLocation();

    const handlePopState = () => saveCurrentLocation();
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentLocation();
      }
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushStateWrapper(...args) {
      // @ts-ignore - history typings don't match rest args in JS
      const result = originalPushState.apply(this, args);
      saveCurrentLocation();
      return result;
    };

    window.history.replaceState = function replaceStateWrapper(...args) {
      // @ts-ignore - history typings don't match rest args in JS
      const result = originalReplaceState.apply(this, args);
      saveCurrentLocation();
      return result;
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pagehide', saveCurrentLocation);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pagehide', saveCurrentLocation);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.sessionStorage.getItem(DID_RESTORE_KEY) === 'true') {
      return;
    }

    const currentPath = `${window.location.pathname}${window.location.search || ''}`;
    if (window.location.pathname !== '/') {
      return;
    }

    const lastRoute = window.localStorage.getItem(LAST_ROUTE_KEY);
    if (!isSafeInternalPath(lastRoute)) {
      return;
    }

    if (lastRoute === '/' || lastRoute === currentPath) {
      return;
    }

    const isStandalone = isStandaloneDisplay();
    const navType = getNavigationType();

    if (isStandalone || navType === 'reload') {
      window.sessionStorage.setItem(DID_RESTORE_KEY, 'true');
      router.replace(lastRoute);
    }
  }, [router]);

  return null;
}

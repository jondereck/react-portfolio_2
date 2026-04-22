'use client';

import { useEffect } from 'react';

export default function PwaRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    if (process.env.NODE_ENV !== 'production') {
      // Avoid breaking Next.js dev/HMR due to SW caching of webpack chunks.
      // Also proactively unregister any existing SW from previous runs.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);

      if ('caches' in window) {
        window.caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
          .catch(() => undefined);
      }

      return undefined;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Service worker registration failed.', error);
        }
      }
    };

    register();
    return undefined;
  }, []);

  return null;
}

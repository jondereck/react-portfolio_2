'use client';

import { useEffect } from 'react';

export default function PwaRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
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

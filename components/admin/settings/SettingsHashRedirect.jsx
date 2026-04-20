'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const hashToRoute = {
  '#navigation': '/admin/navigation',
  '#integrations': '/admin/integrations',
  '#security': '/admin/security',
};

export default function SettingsHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const target = hashToRoute[window.location.hash];
    if (!target) return;

    router.replace(target);
  }, [router]);

  return null;
}


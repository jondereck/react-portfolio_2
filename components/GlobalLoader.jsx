'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import UniversalLoader from '@/components/UniversalLoader';
import { getRouteLoadingCopy } from '@/lib/route-loading-copy';
import { useLoadingStore } from '@/store/loading';

export default function GlobalLoader({
  forceVisible = false,
  message: forcedMessage,
  hint,
  brand,
  steps,
  footer,
}) {
  const pathname = usePathname();
  const copy = getRouteLoadingCopy(pathname);
  const loading = useLoadingStore((state) => state.loading);
  const message = useLoadingStore((state) => state.message);
  const visible = forceVisible || loading;
  const activeMessage = forcedMessage || message || copy.message;

  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const html = document.documentElement;
    const update = () => {
      const savedDark =
        typeof window !== 'undefined' && window.localStorage.getItem('theme') === 'dark';
      if (savedDark && !html.classList.contains('dark')) {
        html.classList.add('dark');
      }
      setTheme(html.classList.contains('dark') ? 'dark' : 'light');
    };
    update();

    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <UniversalLoader
      isVisible={visible}
      brand={brand || copy.brand}
      theme={theme}
      message={activeMessage}
      hint={hint || copy.hint}
      steps={steps || copy.steps}
      footer={footer}
    />
  );
}

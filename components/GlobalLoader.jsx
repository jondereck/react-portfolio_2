'use client';

import { useEffect, useState } from 'react';
import UniversalLoader from '@/components/UniversalLoader';
import { useLoadingStore } from '@/store/loading';

export default function GlobalLoader({
  forceVisible = false,
  message: forcedMessage,
  hint = 'Loading content...',
}) {
  const loading = useLoadingStore((state) => state.loading);
  const message = useLoadingStore((state) => state.message);
  const visible = forceVisible || loading;
  const activeMessage = forcedMessage || message || 'Loading';

  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const html = document.documentElement;
    const update = () => setTheme(html.classList.contains('dark') ? 'dark' : 'light');
    update();

    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return <UniversalLoader isVisible={visible} brand="Welcome" theme={theme} message={activeMessage} hint={hint} />;
}

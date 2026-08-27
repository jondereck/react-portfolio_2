'use client';

import { useEffect } from 'react';
import GlobalLoader from '@/components/GlobalLoader';
import { getRouteLoadingCopy } from '@/lib/route-loading-copy';

const REDIRECT_DELAY_MS = 2800;

export default function ToolsRedirect({ destinationUrl }) {
  const copy = getRouteLoadingCopy('/tools');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(destinationUrl);
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [destinationUrl]);

  return (
    <GlobalLoader
      forceVisible
      brand={copy.brand}
      message={copy.message}
      hint={copy.hint}
      steps={copy.steps}
      footer={
        <a
          href={destinationUrl}
          className="inline-flex min-h-11 items-center justify-center text-sm text-slate-500 underline-offset-4 transition hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
        >
          If nothing happens, continue to Drive
        </a>
      }
    />
  );
}

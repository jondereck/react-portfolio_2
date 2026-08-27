'use client';

import GlobalLoader from '@/components/GlobalLoader';
import { getRouteLoadingCopy } from '@/lib/route-loading-copy';

export default function ToolsLoading() {
  const copy = getRouteLoadingCopy('/tools');

  return (
    <GlobalLoader
      forceVisible
      brand={copy.brand}
      message={copy.message}
      hint={copy.hint}
      steps={copy.steps}
    />
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import { getAdminMediaUrl, getPlayableMediaUrl, isVideoUrl } from '../utils';

export default function MediaPreview({
  url,
  alt,
  className = 'h-full w-full object-cover',
  controls = false,
  sourceType,
  sourceId,
}) {
  const resolvedUrl = getAdminMediaUrl(url, sourceType, sourceId);

  if (isVideoUrl(resolvedUrl)) {
    return (
      <video
        src={getPlayableMediaUrl(resolvedUrl)}
        className={className}
        controls={controls}
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={resolvedUrl} alt={alt} className={className} />;
}

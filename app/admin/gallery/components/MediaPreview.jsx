/* eslint-disable @next/next/no-img-element */
'use client';

import { getAdminMediaUrl, getPlayableMediaUrl, isVideoUrl } from '../utils';
import { isPhotoVideo } from '@/lib/gallery-media';

export default function MediaPreview({
  url,
  alt,
  className = 'h-full w-full object-cover',
  controls = false,
  mimeType,
  sourceType,
  sourceId,
}) {
  const resolvedUrl = getAdminMediaUrl(url, sourceType, sourceId);
  const mediaRecord =
    url && typeof url === 'object'
      ? url
      : { imageUrl: resolvedUrl, mimeType, sourceType, sourceId };

  if (isPhotoVideo(mediaRecord, resolvedUrl) || isVideoUrl(resolvedUrl)) {
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

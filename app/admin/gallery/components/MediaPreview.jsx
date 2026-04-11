'use client';

import { getPlayableMediaUrl, isVideoUrl } from '../utils';

export default function MediaPreview({ url, alt, className = 'h-full w-full object-cover', controls = false }) {
  if (isVideoUrl(url)) {
    return (
      <video
        src={getPlayableMediaUrl(url)}
        className={className}
        controls={controls}
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={url} alt={alt} className={className} />;
}

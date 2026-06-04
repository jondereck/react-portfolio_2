/* eslint-disable @next/next/no-img-element */
'use client';

import { getAdminMediaUrl, getPlayableMediaUrl, isVideoUrl } from '../utils';
import { isPhotoAudio, isPhotoVideo } from '@/lib/gallery-media';

export default function MediaPreview({
  url,
  alt,
  className = 'h-full w-full object-cover',
  controls = false,
  mediaRef,
  onLoadStart,
  onLoadedData,
  onCanPlay,
  onError,
  videoProps,
  imageProps,
  mimeType,
  sourceType,
  sourceId,
}) {
  const resolvedUrl = getAdminMediaUrl(url, sourceType, sourceId);
  const mediaRecord =
    url && typeof url === 'object'
      ? url
      : { imageUrl: resolvedUrl, mimeType, sourceType, sourceId };

  if (isPhotoAudio(mediaRecord, resolvedUrl)) {
    return (
      <audio
        ref={mediaRef}
        src={resolvedUrl}
        controls={controls}
        onLoadStart={onLoadStart}
        onLoadedData={onLoadedData}
        onCanPlay={onCanPlay}
        onError={onError}
        preload="metadata"
        className="w-full"
        {...videoProps}
      />
    );
  }

  if (isPhotoVideo(mediaRecord, resolvedUrl) || isVideoUrl(resolvedUrl)) {
    return (
      <video
        ref={mediaRef}
        src={getPlayableMediaUrl(resolvedUrl)}
        className={className}
        controls={controls}
        crossOrigin="anonymous"
        onLoadStart={onLoadStart}
        onLoadedData={onLoadedData}
        onCanPlay={onCanPlay}
        onError={onError}
        playsInline
        preload="metadata"
        {...videoProps}
      />
    );
  }

  return <img src={resolvedUrl} alt={alt} className={className} onLoad={onLoadedData} onError={onError} {...imageProps} />;
}

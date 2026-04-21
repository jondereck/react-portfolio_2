export const isVideoUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.toLowerCase();
  return (
    normalized.includes('/video/upload/') ||
    normalized.endsWith('.mp4') ||
    normalized.endsWith('.mov') ||
    normalized.endsWith('.webm') ||
    normalized.endsWith('.mkv')
  );
};

export const isVideoMimeType = (value) =>
  typeof value === 'string' && value.toLowerCase().startsWith('video/');

export const isPhotoVideo = (photoOrUrl, fallbackUrl = '') => {
  if (!photoOrUrl) return isVideoUrl(fallbackUrl);

  if (typeof photoOrUrl === 'string') {
    return isVideoUrl(photoOrUrl);
  }

  if (isVideoMimeType(photoOrUrl.mimeType)) {
    return true;
  }

  return isVideoUrl(photoOrUrl.imageUrl || fallbackUrl);
};

export const isUnclothyGenerated = (photoOrFilename) => {
  if (!photoOrFilename) return false;

  const filename =
    typeof photoOrFilename === 'string'
      ? photoOrFilename
      : typeof photoOrFilename?.originalFilename === 'string'
        ? photoOrFilename.originalFilename
        : '';

  return typeof filename === 'string' && filename.trim().toLowerCase().includes('unclothy');
};

export const getPlayableMediaUrl = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (!isVideoUrl(value)) return value;
  if (!value.includes('res.cloudinary.com') || !value.includes('/video/upload/')) return value;

  const [withoutQuery, query] = value.split('?');
  const transformed = withoutQuery
    .replace('/video/upload/', '/video/upload/f_mp4,vc_h264,ac_aac,q_auto/')
    .replace(/\.(mov|mkv|webm)$/i, '.mp4');

  return query ? `${transformed}?${query}` : transformed;
};

export const getVideoPosterUrl = (value) => {
  if (!isVideoUrl(value) || !value.includes('res.cloudinary.com') || !value.includes('/video/upload/')) {
    return '';
  }

  const [withoutQuery, query] = value.split('?');
  const posterBase = withoutQuery
    .replace('/video/upload/', '/video/upload/so_0,f_jpg,q_auto/')
    .replace(/\.(mp4|mov|webm|mkv)$/i, '.jpg');

  return query ? `${posterBase}?${query}` : posterBase;
};

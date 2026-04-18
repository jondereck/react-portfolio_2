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

export const getAdminMediaUrl = (photoOrUrl, sourceTypeArg, sourceIdArg) => {
  if (photoOrUrl && typeof photoOrUrl === 'object') {
    const sourceType = photoOrUrl.sourceType;
    const sourceId = photoOrUrl.sourceId;
    const imageUrl = photoOrUrl.imageUrl;

    if (sourceType === 'gdrive' && sourceId) {
      return `/api/admin/integrations/google-drive/files/${encodeURIComponent(sourceId)}`;
    }

    return imageUrl ?? '';
  }

  if (sourceTypeArg === 'gdrive' && sourceIdArg) {
    return `/api/admin/integrations/google-drive/files/${encodeURIComponent(sourceIdArg)}`;
  }

  return photoOrUrl;
};

export const formatLocalDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

export const getPhotoSortTime = (photo) => {
  const value = new Date(photo?.dateTaken ?? photo?.uploadedAt ?? 0).getTime();
  return Number.isNaN(value) ? 0 : value;
};

export const getPhotoDedupeKey = (photo) => {
  if (!photo) return null;
  if (photo.sourceId) return `source:${photo.sourceId}`;
  if (photo.imageUrl) return `url:${photo.imageUrl}`;
  return null;
};

export const areIdListsEqual = (left, right) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
};

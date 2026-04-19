'use client';

import { useMemo, useRef } from 'react';
import GalleryMediaCard from './GalleryMediaCard';

function isVideoMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('video/');
}

export default function GalleryMediaGrid({
  photos,
  albumName,
  selectedPhotoIds,
  togglePhotoSelect,
  selectPhotoRange,
  onOpenPreview,
  emptyState,
}) {
  const orderedIds = useMemo(() => (Array.isArray(photos) ? photos.map((photo) => photo.id) : []), [photos]);
  const touchSelectStateRef = useRef({ active: false, lastPhotoId: null });

  if (!Array.isArray(photos) || photos.length === 0) {
    return <div className="px-4 pb-6 sm:px-5 lg:px-6">{emptyState}</div>;
  }

  return (
    <div
      className="grid grid-cols-2 gap-3 px-4 pb-6 sm:grid-cols-3 sm:px-5 xl:grid-cols-4 lg:px-6"
      onPointerMove={(event) => {
        if (event.pointerType !== 'touch' || !touchSelectStateRef.current.active) return;
        const target = event.target instanceof Element ? event.target.closest('[data-photo-id]') : null;
        const nextPhotoId = Number(target?.getAttribute('data-photo-id'));
        if (!nextPhotoId || nextPhotoId === touchSelectStateRef.current.lastPhotoId) return;
        touchSelectStateRef.current.lastPhotoId = nextPhotoId;
        selectPhotoRange?.(nextPhotoId, orderedIds);
      }}
      onPointerUp={() => {
        touchSelectStateRef.current = { active: false, lastPhotoId: null };
      }}
      onPointerCancel={() => {
        touchSelectStateRef.current = { active: false, lastPhotoId: null };
      }}
    >
      {photos.map((photo) => {
        const selected = Array.isArray(selectedPhotoIds) && selectedPhotoIds.includes(photo.id);
        const statusLabel = isVideoMime(photo.mimeType) ? 'Video' : 'Ready';

        return (
          <div
            key={photo.id}
            data-photo-id={photo.id}
            onPointerDown={(event) => {
              if (event.pointerType !== 'touch') return;
              const target = event.target;
              if (target instanceof Element && target.closest('button,input,label,a,video')) {
                return;
              }
              touchSelectStateRef.current = { active: true, lastPhotoId: photo.id };
              selectPhotoRange?.(photo.id, orderedIds, { resetAnchor: true });
            }}
          >
            <GalleryMediaCard
              photo={photo}
              albumName={albumName}
              selected={selected}
              statusLabel={statusLabel}
              onOpenPreview={() => onOpenPreview?.(photo)}
              onToggleSelect={(event) => {
                togglePhotoSelect?.(photo.id, { shiftKey: Boolean(event?.shiftKey) });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}


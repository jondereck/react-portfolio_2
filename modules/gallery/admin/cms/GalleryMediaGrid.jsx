'use client';

import { useMemo, useRef, useState } from 'react';
import GalleryMediaCard from './GalleryMediaCard';

function isVideoMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('video/');
}

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD_PX = 8;

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
  const selectedCount = Array.isArray(selectedPhotoIds) ? selectedPhotoIds.length : 0;
  const [touchSelecting, setTouchSelecting] = useState(false);
  const touchSelectStateRef = useRef({
    mode: 'idle',
    pointerId: null,
    timerId: null,
    startX: 0,
    startY: 0,
    anchorPhotoId: null,
    lastPhotoId: null,
    captureEl: null,
    orderedIds: [],
  });

  if (!Array.isArray(photos) || photos.length === 0) {
    return <div className="px-4 pb-6 sm:px-5 lg:px-6">{emptyState}</div>;
  }

  return (
    <div
      className={`grid grid-cols-2 gap-3 px-4 pb-6 sm:grid-cols-3 sm:px-5 xl:grid-cols-4 lg:px-6 ${selectedCount > 0 ? 'pb-32 lg:pb-28' : ''}`}
      style={{ touchAction: touchSelecting ? 'none' : 'pan-y' }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'touch') return;

        if (touchSelectStateRef.current.mode === 'pending' && touchSelectStateRef.current.pointerId === event.pointerId) {
          const dx = Math.abs(event.clientX - touchSelectStateRef.current.startX);
          const dy = Math.abs(event.clientY - touchSelectStateRef.current.startY);
          if (dx > MOVE_CANCEL_THRESHOLD_PX || dy > MOVE_CANCEL_THRESHOLD_PX) {
            if (touchSelectStateRef.current.timerId) {
              clearTimeout(touchSelectStateRef.current.timerId);
            }
            touchSelectStateRef.current = {
              mode: 'idle',
              pointerId: null,
              timerId: null,
              startX: 0,
              startY: 0,
              anchorPhotoId: null,
              lastPhotoId: null,
              captureEl: null,
              orderedIds: [],
            };
            setTouchSelecting(false);
          }
          return;
        }

        if (touchSelectStateRef.current.mode !== 'active') return;

        const target = event.target instanceof Element ? event.target.closest('[data-photo-id]') : null;
        const nextPhotoId = Number(target?.getAttribute('data-photo-id'));
        if (!nextPhotoId || nextPhotoId === touchSelectStateRef.current.lastPhotoId) return;
        touchSelectStateRef.current.lastPhotoId = nextPhotoId;
        event.preventDefault();
        selectPhotoRange?.(nextPhotoId, touchSelectStateRef.current.orderedIds);
      }}
      onPointerUp={() => {
        if (touchSelectStateRef.current.timerId) {
          clearTimeout(touchSelectStateRef.current.timerId);
        }
        touchSelectStateRef.current = {
          mode: 'idle',
          pointerId: null,
          timerId: null,
          startX: 0,
          startY: 0,
          anchorPhotoId: null,
          lastPhotoId: null,
          captureEl: null,
          orderedIds: [],
        };
        setTouchSelecting(false);
      }}
      onPointerCancel={() => {
        if (touchSelectStateRef.current.timerId) {
          clearTimeout(touchSelectStateRef.current.timerId);
        }
        touchSelectStateRef.current = {
          mode: 'idle',
          pointerId: null,
          timerId: null,
          startX: 0,
          startY: 0,
          anchorPhotoId: null,
          lastPhotoId: null,
          captureEl: null,
          orderedIds: [],
        };
        setTouchSelecting(false);
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

              if (touchSelectStateRef.current.timerId) {
                clearTimeout(touchSelectStateRef.current.timerId);
              }

              const captureEl = event.currentTarget instanceof Element ? event.currentTarget : null;
              const pointerId = event.pointerId;
              const anchorPhotoId = photo.id;
              const nextOrderedIds = orderedIds;

              const timerId = setTimeout(() => {
                if (touchSelectStateRef.current.mode !== 'pending' || touchSelectStateRef.current.pointerId !== pointerId) {
                  return;
                }

                touchSelectStateRef.current.mode = 'active';
                touchSelectStateRef.current.timerId = null;
                touchSelectStateRef.current.lastPhotoId = anchorPhotoId;
                touchSelectStateRef.current.orderedIds = nextOrderedIds;
                setTouchSelecting(true);

                try {
                  touchSelectStateRef.current.captureEl?.setPointerCapture?.(pointerId);
                } catch {
                  // ignore
                }

                selectPhotoRange?.(anchorPhotoId, nextOrderedIds, { resetAnchor: true });
              }, LONG_PRESS_MS);

              touchSelectStateRef.current = {
                mode: 'pending',
                pointerId,
                timerId,
                startX: event.clientX,
                startY: event.clientY,
                anchorPhotoId,
                lastPhotoId: null,
                captureEl,
                orderedIds: nextOrderedIds,
              };
              setTouchSelecting(false);
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


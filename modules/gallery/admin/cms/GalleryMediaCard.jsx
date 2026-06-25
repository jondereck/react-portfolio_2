'use client';

import { Check, Music, MoreHorizontal } from 'lucide-react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import { isPhotoAudio, shouldBlurPhoto } from '@/lib/gallery-media';

function isVideoMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('video/');
}

export default function GalleryMediaCard({
  photo,
  albumName,
  selected,
  statusLabel,
  blurUnclothyGenerated = true,
  onToggleSelect,
  onOpenPreview,
}) {
  const title = photo?.caption || photo?.originalFilename || photo?.sourceId || `media_${photo?.id}`;
  const isVideo = isVideoMime(photo?.mimeType);
  const isAudio = Boolean(photo) && isPhotoAudio(photo, photo?.imageUrl);
  const shouldBlur = Boolean(photo) && shouldBlurPhoto(photo, { blurEnabled: blurUnclothyGenerated });

  return (
    <article
      className={`group overflow-hidden rounded-[26px] border text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-200 dark:border-blue-400 dark:bg-blue-950/30 dark:ring-blue-900/40'
          : 'border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700 dark:hover:bg-slate-900'
      }`}
    >
      <div className="relative">
        <button
          type="button"
          className="block w-full touch-pan-y"
          style={{ touchAction: 'pan-y' }}
          onClick={onOpenPreview}
          aria-label={`View ${title}`}
        >
          <div className="relative aspect-square bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
            {isAudio ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-sky-500/15 dark:from-indigo-500/20 dark:via-purple-500/15 dark:to-sky-500/20">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 text-indigo-600 shadow-sm dark:bg-slate-900/70 dark:text-indigo-300">
                  <Music className="h-8 w-8" />
                </span>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700 backdrop-blur dark:bg-slate-900/70 dark:text-slate-200">
                  Audio
                </span>
              </div>
            ) : photo?.imageUrl ? (
              <MediaPreview
                url={photo.imageUrl}
                mimeType={photo.mimeType}
                sourceType={photo.sourceType}
                sourceId={photo.sourceId}
                alt={title}
                className={`h-full w-full object-cover ${isVideo ? 'pointer-events-none' : ''} ${shouldBlur ? 'blur-md' : ''}`}
                controls={false}
              />
            ) : null}
            {isVideo ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-full border border-white/30 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur">
                  Video
                </span>
              </div>
            ) : null}
            {shouldBlur ? (
              <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                NSFW
              </div>
            ) : null}
          </div>
        </button>

        {selected ? (
          <button
            type="button"
            onClick={onToggleSelect}
            aria-label="Deselect"
            className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700"
          >
            <Check className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleSelect}
            className="absolute left-2 top-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
          >
            Select
          </button>
        )}


      </div>

      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-semibold text-blue-600 dark:text-blue-400">{title}</p>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">{albumName || ''}</span>
          <MoreHorizontal className="h-4 w-4 shrink-0 opacity-60" />
        </div>
      </div>
    </article>
  );
}


'use client';

import { MoreHorizontal } from 'lucide-react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import { shouldBlurPhoto } from '@/lib/gallery-media';

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
  const shouldBlur = Boolean(photo) && shouldBlurPhoto(photo, { blurEnabled: blurUnclothyGenerated });

  return (
    <article
      className={`group overflow-hidden rounded-[26px] border text-left transition ${
        selected
          ? 'border-sky-500 bg-sky-50 shadow-sm ring-2 ring-sky-200 dark:border-sky-400 dark:bg-sky-950/30 dark:ring-sky-900/40'
          : 'border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/20 dark:hover:border-slate-700 dark:hover:bg-slate-900'
      }`}
    >
      <div className="relative">
        <button type="button" className="block w-full" onClick={onOpenPreview} aria-label={`View ${title}`}>
          <div className="relative aspect-square bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
            {photo?.imageUrl ? (
              <MediaPreview
                url={photo.imageUrl}
                mimeType={photo.mimeType}
                sourceType={photo.sourceType}
                sourceId={photo.sourceId}
                alt={title}
                className={`h-full w-full object-cover ${shouldBlur ? 'blur-md' : ''}`}
                controls={false}
              />
            ) : null}
            {shouldBlur ? (
              <div className="pointer-events-none absolute left-2 top-2 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                NSFW
              </div>
            ) : null}
          </div>
        </button>

        <button
          type="button"
          onClick={onToggleSelect}
          className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm transition ${
            selected
              ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
              : 'bg-white text-slate-900 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {selected ? 'Selected' : 'Select'}
        </button>


      </div>

      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{title}</p>
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">{albumName || ''}</span>
          <MoreHorizontal className="h-4 w-4 shrink-0 opacity-60" />
        </div>
      </div>
    </article>
  );
}


'use client';

import { useMemo } from 'react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import { isUnclothyGenerated } from '@/lib/gallery-media';

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export default function GalleryInspectorPanel({ photo, album, onClose, children, blurUnclothyGenerated = true }) {
  const title = photo?.caption || photo?.originalFilename || photo?.sourceId || (photo ? `media_${photo.id}` : '');
  const subtitle = album?.name || '';
  const shouldBlur = Boolean(photo) && blurUnclothyGenerated && isUnclothyGenerated(photo);

  const quickInfo = useMemo(() => {
    if (!photo) return [];
    return [
      { label: 'Type', value: photo.mimeType || '—' },
      { label: 'Size', value: formatBytes(photo.fileSizeBytes) || '—' },
      { label: 'Source', value: photo.sourceType || '—' },
      { label: 'Created', value: formatDate(photo.createdAt || photo.uploadedAt || photo.updatedAt) || '—' },
    ];
  }, [photo]);

  if (!photo) {
    return (
      <aside className="hidden border-l border-slate-200 bg-slate-50/40 p-3 lg:block dark:border-slate-800 dark:bg-slate-950/20">
        <div className="sticky top-28">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Inspector</p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">Selected item</h2>
            </div>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
              onClick={onClose}
              disabled={!onClose}
            >
              Close
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Select one media item to see details.
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden border-l border-slate-200 bg-slate-50/40 p-3 lg:block dark:border-slate-800 dark:bg-slate-950/20">
      <div className="sticky top-28">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Inspector</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">Selected item</h2>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="aspect-square bg-slate-100 dark:bg-slate-950/40">
            <MediaPreview
              url={photo.imageUrl}
              mimeType={photo.mimeType}
              sourceType={photo.sourceType}
              sourceId={photo.sourceId}
              alt={title}
              className={`h-full w-full object-contain ${shouldBlur ? 'blur-md' : ''}`}
              controls={false}
            />
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Quick info
            </p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
              {quickInfo.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                  <span className="truncate font-medium text-slate-900 dark:text-slate-50">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {children ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}


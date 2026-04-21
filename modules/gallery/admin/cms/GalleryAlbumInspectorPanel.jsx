'use client';

import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import { getAdminMediaUrl } from '@/app/admin/gallery/utils';

function resolveAlbumCoverUrl(album) {
  const coverPhoto = album?.coverPhoto ?? null;
  if (!coverPhoto) return '';
  const url = getAdminMediaUrl(coverPhoto);
  return typeof url === 'string' ? url : '';
}

export default function GalleryAlbumInspectorPanel({ album, photosCount, shareLink, siteOrigin }) {
  if (!album) {
    return (
      <aside className="hidden border-l border-slate-200 bg-slate-50/40 p-3 lg:block dark:border-slate-800 dark:bg-slate-950/20">
        <div className="sticky top-28">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Select an album to see details.
          </div>
        </div>
      </aside>
    );
  }

  const coverUrl = resolveAlbumCoverUrl(album);
  const coverPhoto = album?.coverPhoto ?? null;
  const currentCount =
    typeof album?._count?.photos === 'number'
      ? album._count.photos
      : typeof photosCount === 'number'
        ? photosCount
        : 0;

  return (
    <aside className="hidden border-l border-slate-200 bg-slate-50/40 p-3 lg:block dark:border-slate-800 dark:bg-slate-950/20">
      <div className="sticky top-28 space-y-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="aspect-square bg-slate-100 dark:bg-slate-950/40">
            {coverUrl ? (
              <MediaPreview
                url={coverUrl}
                mimeType={coverPhoto?.mimeType}
                sourceType={coverPhoto?.sourceType}
                sourceId={coverPhoto?.sourceId}
                alt={album.name}
                className="h-full w-full object-cover"
                controls={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                No cover
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{album.name}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{currentCount} item{currentCount === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Quick info</p>
          <div className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className="font-medium text-slate-900 dark:text-slate-50">{album.isPublished ? 'Published' : 'Draft'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Cover</span>
              <span className="font-medium text-slate-900 dark:text-slate-50">{album.coverPhotoId ? 'Assigned' : 'None'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Slug</p>
          <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-50">
            {album.slug ? `/gallery/${album.slug}` : 'Generated when saved'}
          </p>
          {siteOrigin && album.slug ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{`${siteOrigin}/gallery/${album.slug}`}</p>
          ) : null}
        </div>

        {shareLink ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Share link</p>
            <p className="mt-2 break-all text-xs text-slate-600 dark:text-slate-300">{shareLink}</p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}


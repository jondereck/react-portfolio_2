'use client';

import { ChevronRight, FolderOpen, Plus, Search, SlidersHorizontal } from 'lucide-react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import { getAdminMediaUrl } from '@/app/admin/gallery/utils';

function resolveAlbumCoverUrl(album) {
  const coverPhoto = album?.coverPhoto ?? null;
  if (!coverPhoto) return '';
  const url = getAdminMediaUrl(coverPhoto);
  return typeof url === 'string' ? url : '';
}

export default function GalleryAlbumsSidebar({
  albums,
  selectedAlbumId,
  loadingAlbums = false,
  onSelectAlbum,
  onCreateAlbumClick,
  mobileAlbumName,
  mobileAlbumCountLabel,
  onMobileOpenFilter,
  onMobileOpenSwitch,
  onMobileOpenImport,
  onMobileFocusSearch,
  showMobileChips = true,
}) {
  const activeAlbum = Array.isArray(albums) ? albums.find((album) => album.id === selectedAlbumId) : null;
  const activeName = mobileAlbumName || activeAlbum?.name;
  const activeCountLabel =
    mobileAlbumCountLabel ||
    (typeof activeAlbum?._count?.photos === 'number'
      ? `${activeAlbum._count.photos} items`
      : typeof activeAlbum?.mediaCount === 'number'
        ? `${activeAlbum.mediaCount} items`
        : '');

  return (
    <>
      <section className="border-b border-slate-200 px-4 py-3 sm:px-5 lg:hidden dark:border-slate-800">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Current album
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{activeName || 'Select album'}</p>
              {activeCountLabel ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activeCountLabel}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Active intake target for uploads and imports.</p>
              )}
            </div>
            <button
              type="button"
              onClick={onMobileOpenSwitch}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
            >
              Switch
            </button>
          </div>

          {showMobileChips ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={onMobileFocusSearch}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 text-sm font-medium ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-50 dark:ring-slate-800"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
              <button
                type="button"
                onClick={onMobileOpenFilter}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 text-sm font-medium ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-50 dark:ring-slate-800"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filter
              </button>
              <button
                type="button"
                onClick={onMobileOpenImport}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 text-sm font-medium ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-50 dark:ring-slate-800"
              >
                <FolderOpen className="h-4 w-4" />
                Import
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="hidden border-r border-slate-200 bg-slate-50/60 p-5 lg:block dark:border-slate-800 dark:bg-slate-950/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Albums</p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">Quick switching</h2>
          </div>
          <button
            type="button"
            onClick={onCreateAlbumClick}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
            aria-label="Add album"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {loadingAlbums ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Loading albums…
            </div>
          ) : null}

          {!loadingAlbums && (!Array.isArray(albums) || albums.length === 0) ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Create an album to get started.
            </div>
          ) : null}

          {Array.isArray(albums)
            ? albums.map((album) => {
                const isActive = album.id === selectedAlbumId;
                const countLabel =
                  typeof album?._count?.photos === 'number'
                    ? `${album._count.photos} items`
                    : typeof album.mediaCount === 'number'
                      ? `${album.mediaCount} items`
                      : typeof album.photoCount === 'number'
                        ? `${album.photoCount} items`
                        : typeof album.count === 'number'
                          ? `${album.count} items`
                          : '';
                const coverUrl = resolveAlbumCoverUrl(album);
                const coverPhoto = album?.coverPhoto ?? null;

                return (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => onSelectAlbum?.(album.id)}
                    className={`w-full rounded-[24px] border p-3 text-left transition ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-50 dark:bg-slate-50 dark:text-slate-900'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
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
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                              IMG
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{album.name}</p>
                          {countLabel ? (
                            <p
                              className={`mt-1 text-xs ${
                                isActive ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {countLabel}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 ${isActive ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`} />
                    </div>
                  </button>
                );
              })
            : null}
        </div>
      </aside>
    </>
  );
}

'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';
import { ChevronRight, Folder, Home, Image, Loader2, Play, RefreshCw, X } from 'lucide-react';
import { fetchJson, buttonStyles, ghostButtonStyles } from './galleryAdminShared';

const emptyBrowseState = {
  loading: false,
  previewLoadingMore: false,
  folders: [],
  files: [],
  breadcrumbs: [{ id: 'root', name: 'My Drive' }],
  currentFolder: null,
  nextPreviewPageToken: null,
  error: '',
};

export default function GalleryDriveFolderPicker({
  open,
  onClose,
  onSelectFolder,
  selectedFolderId,
}) {
  const [browseState, setBrowseState] = useState(emptyBrowseState);

  const selectFolder = async (folder) => {
    try {
      const params = new URLSearchParams({
        parentId: folder.id,
        previewPageSize: '8',
      });
      const payload = await fetchJson(`/api/admin/integrations/google-drive/folders?${params.toString()}`);
      const currentFolder = payload?.currentFolder ?? null;

      onSelectFolder({
        id: folder.id,
        name: folder.name,
        breadcrumbs: Array.isArray(payload?.breadcrumbs)
          ? payload.breadcrumbs
          : [...browseState.breadcrumbs, { id: folder.id, name: folder.name }],
        mediaCount: typeof currentFolder?.mediaCount === 'number' ? currentFolder.mediaCount : null,
      });
      onClose();
    } catch (error) {
      setBrowseState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : 'Unable to load folder details.',
      }));
    }
  };

  const loadFolders = async (parentId = null, options = {}) => {
    const { appendFiles = false, previewPageToken = null, previewPageSize = 8 } = options;

    setBrowseState((current) => ({
      ...current,
      loading: appendFiles ? current.loading : true,
      previewLoadingMore: appendFiles ? true : false,
      error: '',
    }));

    try {
      const params = new URLSearchParams();
      if (parentId) {
        params.set('parentId', parentId);
      }
      if (previewPageToken) {
        params.set('previewPageToken', previewPageToken);
      }
      params.set('previewPageSize', String(previewPageSize));

      const payload = await fetchJson(
        `/api/admin/integrations/google-drive/folders${params.toString() ? `?${params.toString()}` : ''}`,
      );

      const nextFiles = Array.isArray(payload?.files) ? payload.files : [];

      setBrowseState((current) => ({
        loading: false,
        previewLoadingMore: false,
        folders: Array.isArray(payload?.folders) ? payload.folders : [],
        files: appendFiles ? [...current.files, ...nextFiles] : nextFiles,
        breadcrumbs:
          Array.isArray(payload?.breadcrumbs) && payload.breadcrumbs.length > 0
            ? payload.breadcrumbs
            : [{ id: 'root', name: 'My Drive' }],
        currentFolder: payload?.currentFolder ?? null,
        nextPreviewPageToken: payload?.nextPreviewPageToken ?? null,
        error: '',
      }));
    } catch (error) {
      setBrowseState((current) => ({
        ...current,
        loading: false,
        previewLoadingMore: false,
        error: error instanceof Error ? error.message : 'Unable to browse Google Drive folders.',
      }));
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    loadFolders();
  }, [open]);

  const currentParentId = browseState.currentFolder?.id ?? null;

  const loadMorePreviews = async () => {
    if (!currentParentId || !browseState.nextPreviewPageToken || browseState.previewLoadingMore || browseState.loading) {
      return;
    }

    await loadFolders(currentParentId, {
      appendFiles: true,
      previewPageToken: browseState.nextPreviewPageToken,
      previewPageSize: 8,
    });
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-0 sm:p-6">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel className="flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:h-auto sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:max-w-4xl sm:rounded-2xl">
                <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Google Drive</p>
                      <Dialog.Title className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                        Browse folders
                      </Dialog.Title>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Navigate through Drive folders and select one import source.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={onClose}
                    >
                      <X className="size-4" />
                      <span className="ml-2 hidden sm:inline">Close</span>
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {browseState.breadcrumbs.map((crumb, index) => {
                      const isRoot = crumb.id === 'root';
                      const isCurrent = index === browseState.breadcrumbs.length - 1;
                      const crumbParentId = isRoot ? null : crumb.id;

                      return (
                        <Fragment key={`${crumb.id}-${index}`}>
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
                              isCurrent
                                ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
                                : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                            onClick={() => loadFolders(crumbParentId)}
                          >
                            {isRoot ? <Home className="size-3.5" /> : <Folder className="size-3.5" />}
                            <span className="max-w-[10rem] truncate">{crumb.name}</span>
                          </button>
                          {index < browseState.breadcrumbs.length - 1 ? (
                            <ChevronRight className="size-4 text-slate-400" />
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Current location
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {browseState.currentFolder?.name || 'My Drive'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Select one folder only. Subfolders are not imported recursively in this version.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto sm:px-3"
                        onClick={() => loadFolders(currentParentId)}
                        disabled={browseState.loading}
                        aria-label={browseState.loading ? 'Refreshing folders' : 'Refresh folders'}
                        title={browseState.loading ? 'Refreshing folders' : 'Refresh folders'}
                      >
                        {browseState.loading ? (
                          <>
                            <Loader2 className="size-4 animate-spin sm:mr-2" />
                            <span className="hidden sm:inline">Refreshing...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="size-4 sm:mr-2" />
                            <span className="hidden sm:inline">Refresh</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {browseState.error ? (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                      {browseState.error}
                    </div>
                  ) : null}

                  {browseState.loading && browseState.folders.length === 0 && browseState.files.length === 0 ? (
                    <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Loading folders and previews...
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                      <section className="space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Folders
                              </p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Browse into subfolders or select the current folder for import.
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                              {browseState.folders.length} found
                            </span>
                          </div>
                        </div>

                        {browseState.folders.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                            No subfolders found in this location.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {browseState.folders.map((folder) => {
                              const isSelected = selectedFolderId === folder.id;

                              return (
                                <div
                                  key={folder.id}
                                  className={`flex flex-col gap-3 rounded-xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                                    isSelected
                                      ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30'
                                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    onClick={() => loadFolders(folder.id)}
                                  >
                                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                      <Folder className="size-4" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {folder.name}
                                      </span>
                                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                        Browse subfolders or select this folder for import.
                                      </span>
                                    </span>
                                  </button>

                                  <div className="flex flex-wrap gap-2 sm:justify-end">
                                    <button
                                      type="button"
                                      className={ghostButtonStyles}
                                      onClick={() => loadFolders(folder.id)}
                                    >
                                      Open
                                    </button>
                                    <button
                                      type="button"
                                      className={buttonStyles}
                                      onClick={() => {
                                        void selectFolder(folder);
                                      }}
                                    >
                                      {isSelected ? 'Selected' : 'Select'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      <section className="space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Files in this folder
                              </p>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Preview only. Import still uses the selected folder as a single source.
                              </p>
                            </div>
                            <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                              {browseState.files.length} previews
                            </span>
                          </div>
                        </div>

                        <div
                          className="max-h-[42vh] overflow-y-auto pr-1 sm:max-h-[28rem]"
                          onScroll={(event) => {
                            const target = event.currentTarget;
                            const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 240;

                            if (nearBottom) {
                              loadMorePreviews();
                            }
                          }}
                        >
                          {browseState.files.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                              No media previews found in this location.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                                {browseState.files.map((file) => {
                                  const isVideo = file.kind === 'video';

                                  return (
                                    <article
                                      key={file.id}
                                      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                    >
                                      <div className={`relative ${isVideo ? 'aspect-video' : 'aspect-square'} bg-slate-100 dark:bg-slate-950`}>
                                        {isVideo ? (
                                          <video
                                            className="h-full w-full object-cover"
                                            src={file.previewUrl}
                                            muted
                                            playsInline
                                            preload="metadata"
                                          />
                                        ) : (
                                          <img
                                            className="h-full w-full object-cover"
                                            src={file.previewUrl}
                                            alt={file.name}
                                            loading="lazy"
                                          />
                                        )}

                                        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
                                          {isVideo ? <Play className="size-3" /> : <Image className="size-3" />}
                                          {isVideo ? 'Video' : 'Image'}
                                        </div>
                                      </div>

                                      <div className="space-y-1 px-3 py-3">
                                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={file.name}>
                                          {file.name}
                                        </p>
                                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                          {file.mimeType}
                                        </p>
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>

                              <div className="sticky bottom-0 flex flex-col items-center gap-2 border-t border-slate-200 bg-white/95 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                                {browseState.previewLoadingMore ? (
                                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                                    <Loader2 className="size-3.5 animate-spin" />
                                    Loading more thumbnails...
                                  </div>
                                ) : browseState.nextPreviewPageToken ? (
                                  <button
                                    type="button"
                                    className={ghostButtonStyles}
                                    onClick={loadMorePreviews}
                                  >
                                    Load more thumbnails
                                  </button>
                                ) : (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    You have reached the end of this folder preview.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

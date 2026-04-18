'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useState } from 'react';
import { ChevronRight, Folder, Home, Loader2, RefreshCw, X } from 'lucide-react';
import { fetchJson, buttonStyles, ghostButtonStyles } from './galleryAdminShared';

const emptyBrowseState = {
  loading: false,
  folders: [],
  breadcrumbs: [{ id: 'root', name: 'My Drive' }],
  currentFolder: null,
  error: '',
};

export default function GalleryDriveFolderPicker({
  open,
  onClose,
  onSelectFolder,
  selectedFolderId,
}) {
  const [browseState, setBrowseState] = useState(emptyBrowseState);

  const loadFolders = async (parentId = null) => {
    setBrowseState((current) => ({
      ...current,
      loading: true,
      error: '',
    }));

    try {
      const params = new URLSearchParams();
      if (parentId) {
        params.set('parentId', parentId);
      }

      const payload = await fetchJson(
        `/api/admin/integrations/google-drive/folders${params.toString() ? `?${params.toString()}` : ''}`,
      );

      setBrowseState({
        loading: false,
        folders: Array.isArray(payload?.folders) ? payload.folders : [],
        breadcrumbs:
          Array.isArray(payload?.breadcrumbs) && payload.breadcrumbs.length > 0
            ? payload.breadcrumbs
            : [{ id: 'root', name: 'My Drive' }],
        currentFolder: payload?.currentFolder ?? null,
        error: '',
      });
    } catch (error) {
      setBrowseState((current) => ({
        ...current,
        loading: false,
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
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                      {browseState.error}
                    </div>
                  ) : null}

                  {browseState.loading ? (
                    <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Loading folders...
                      </div>
                    </div>
                  ) : browseState.folders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                      No folders found in this location.
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
                                  onSelectFolder({
                                    id: folder.id,
                                    name: folder.name,
                                    breadcrumbs: [...browseState.breadcrumbs, { id: folder.id, name: folder.name }],
                                    imageCount: folder.imageCount,
                                  });
                                  onClose();
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
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

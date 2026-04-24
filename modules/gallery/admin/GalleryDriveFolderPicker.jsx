'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronRight,
  Folder,
  HelpCircle,
  Home,
  Image,
  Loader2,
  MoreVertical,
  Play,
  RefreshCw,
  Search,
  Shield,
  Upload,
  X,
} from 'lucide-react';
import { fetchJson, buttonStyles } from './galleryAdminShared';

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

function GoogleDriveLogo() {
  return (
    <div className="relative h-8 w-8 shrink-0" aria-hidden="true">
      <div className="absolute left-[9px] top-0 h-[18px] w-[10px] -rotate-[30deg] rounded-sm bg-emerald-500" />
      <div className="absolute right-[1px] top-[12px] h-[11px] w-[18px] rounded-sm bg-amber-400" />
      <div className="absolute bottom-[1px] left-[1px] h-[11px] w-[18px] rounded-sm bg-blue-500" />
    </div>
  );
}

export default function GalleryDriveFolderPicker({
  open,
  onClose,
  onSelectFolder,
  selectedFolderId,
}) {
  const [browseState, setBrowseState] = useState(emptyBrowseState);
  const [folderSort, setFolderSort] = useState('recent');
  const [query, setQuery] = useState('');
  const [mobileTab, setMobileTab] = useState('folders');
  const [selectedMediaIds, setSelectedMediaIds] = useState([]);
  const previewScrollRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);

  const selectFolder = async (folder) => {
    try {
      const params = new URLSearchParams({
        parentId: folder.id,
        previewPageSize: '8',
        folderSort,
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
        selectedFileIds: folder.id === browseState.currentFolder?.id ? selectedMediaIds : [],
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
    const {
      appendFiles = false,
      previewPageToken = null,
      previewPageSize = 8,
      folderSortOverride = null,
      keepSelectedMedia = true,
    } = options;
    const effectiveFolderSort = folderSortOverride || folderSort;

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
      params.set('folderSort', effectiveFolderSort);

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

      if (!appendFiles && !keepSelectedMedia) {
        setSelectedMediaIds([]);
      }

      return payload;
    } catch (error) {
      setBrowseState((current) => ({
        ...current,
        loading: false,
        previewLoadingMore: false,
        error: error instanceof Error ? error.message : 'Unable to browse Google Drive folders.',
      }));
      return null;
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery('');
    setMobileTab('folders');
    setSelectedMediaIds([]);
    loadFolders();
  }, [open]);

  const currentParentId = browseState.currentFolder?.id ?? null;

  const loadMorePreviews = async () => {
    if (!browseState.nextPreviewPageToken || browseState.previewLoadingMore || browseState.loading) {
      return;
    }

    await loadFolders(currentParentId, {
      appendFiles: true,
      previewPageToken: browseState.nextPreviewPageToken,
      previewPageSize: 8,
    });
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!browseState.nextPreviewPageToken || browseState.previewLoadingMore || browseState.loading) {
      return;
    }

    const root = previewScrollRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMorePreviews();
        }
      },
      { root, rootMargin: '240px 0px', threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [browseState.loading, browseState.nextPreviewPageToken, browseState.previewLoadingMore, folderSort, open]);

  const filteredFolders = browseState.folders.filter((folder) =>
    folder.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const selectedMediaSet = new Set(selectedMediaIds);

  const handleViewAllMedia = async () => {
    if (browseState.previewLoadingMore || browseState.loading) {
      return;
    }

    let nextToken = browseState.nextPreviewPageToken;
    while (nextToken) {
      const payload = await loadFolders(currentParentId, {
        appendFiles: true,
        previewPageToken: nextToken,
        previewPageSize: 24,
      });
      nextToken = payload?.nextPreviewPageToken ?? null;
    }
  };

  const selectedFolder = browseState.folders.find((folder) => folder.id === selectedFolderId) || browseState.currentFolder;
  const selectedFolderName = selectedFolder?.name || browseState.currentFolder?.name || 'My Drive';

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
              <Dialog.Panel className="mx-auto flex h-[100dvh] w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[calc(100dvh-3rem)] sm:rounded-[2rem]">
                <header className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <GoogleDriveLogo />
                      <div className="min-w-0">
                        <Dialog.Title className="truncate text-sm font-black text-slate-950 sm:text-base">
                          Google Drive Import
                        </Dialog.Title>
                        <p className="truncate text-xs text-slate-500 sm:text-sm">Choose one source folder</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
                        onClick={() => loadFolders(currentParentId)}
                        disabled={browseState.loading}
                      >
                        {browseState.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        {browseState.loading ? 'Refreshing...' : 'Refresh'}
                      </button>
                      <button
                        type="button"
                        aria-label="Close"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                        onClick={onClose}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                      <Home className="h-3.5 w-3.5" />
                      Drive
                    </span>
                    {browseState.breadcrumbs.map((crumb, index) => {
                      const isCurrent = index === browseState.breadcrumbs.length - 1;
                      const crumbParentId = crumb.id === 'root' ? null : crumb.id;

                      return (
                        <Fragment key={`${crumb.id}-${index}`}>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                          <button
                            type="button"
                            className={`h-8 max-w-[150px] shrink-0 truncate rounded-full px-3 text-xs font-semibold transition sm:max-w-[220px] ${
                              isCurrent
                                ? 'bg-slate-950 text-white'
                                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                            }`}
                            onClick={() => loadFolders(crumbParentId, { keepSelectedMedia: false })}
                          >
                            {crumb.name}
                          </button>
                        </Fragment>
                      );
                    })}
                  </div>

                  <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 lg:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileTab('folders')}
                      className={`h-10 rounded-xl text-sm font-black transition ${
                        mobileTab === 'folders' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Folders
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileTab('preview')}
                      className={`h-10 rounded-xl text-sm font-black transition ${
                        mobileTab === 'preview' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[390px_1fr] lg:overflow-hidden">
                  <aside
                    className={`${mobileTab === 'folders' ? 'block' : 'hidden'} border-b border-slate-200 bg-slate-50/60 p-4 lg:block lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-5`}
                  >
                    <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Folders</p>
                          <p className="mt-1 text-sm text-slate-500">Browse and select source</p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                          onClick={() => {
                            const nextSort = folderSort === 'recent' ? 'name' : 'recent';
                            setFolderSort(nextSort);
                            loadFolders(currentParentId, { folderSortOverride: nextSort });
                          }}
                          disabled={browseState.loading || browseState.previewLoadingMore}
                          title={folderSort === 'recent' ? 'Sort: recent changes' : 'Sort: name'}
                        >
                          <ArrowUpDown className="h-4 w-4" />
                          {folderSort === 'recent' ? 'Recent' : 'Name'}
                        </button>
                      </div>

                      <label className="relative mt-4 block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Search folders..."
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        />
                      </label>
                    </div>

                    {browseState.error ? (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {browseState.error}
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-2 pb-4">
                      {browseState.loading && browseState.folders.length === 0 ? (
                        <div className="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading folders...
                          </div>
                        </div>
                      ) : null}

                      {filteredFolders.length > 0
                        ? filteredFolders.map((folder) => {
                            const isSelected = selectedFolderId === folder.id;

                            return (
                              <div
                                key={folder.id}
                                role="button"
                                tabIndex={0}
                                className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                  isSelected
                                    ? 'border-blue-200 bg-blue-50 shadow-sm'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  loadFolders(folder.id, { keepSelectedMedia: false });
                                  setMobileTab('preview');
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    loadFolders(folder.id, { keepSelectedMedia: false });
                                    setMobileTab('preview');
                                  }
                                }}
                              >
                                <span
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                                    isSelected
                                      ? 'border-blue-200 bg-white text-blue-600'
                                      : 'border-slate-200 bg-slate-50 text-slate-500'
                                  }`}
                                >
                                  <Folder className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-sm font-bold text-slate-950">{folder.name}</span>
                                    {isSelected ? (
                                      <span className="hidden rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:inline">
                                        Selected
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="mt-1 block truncate text-xs text-slate-500">
                                    Browse subfolders or select this folder for import.
                                  </span>
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className={`${buttonStyles} h-8 px-3 py-1 text-xs`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void selectFolder(folder);
                                    }}
                                  >
                                    {isSelected ? 'Selected' : 'Select'}
                                  </button>
                                  {isSelected ? (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                                      <Check className="h-4 w-4" />
                                    </span>
                                  ) : (
                                    <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        : null}

                      {!browseState.loading && filteredFolders.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                          <p className="font-bold text-slate-800">No folders found</p>
                          <p className="mt-1 text-sm text-slate-500">Try another folder name.</p>
                        </div>
                      ) : null}
                    </div>
                  </aside>

                  <section
                    className={`${mobileTab === 'preview' ? 'block' : 'hidden'} bg-white p-4 pb-28 lg:block lg:min-h-0 lg:overflow-y-auto lg:p-6 lg:pb-6`}
                  >
                    <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
                            <Folder className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Current selection</p>
                            <h2 className="mt-1 truncate text-xl font-black text-slate-950">{selectedFolderName}</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              Only this folder will be imported. Subfolders are ignored for now.
                            </p>
                          </div>
                        </div>
                        <span className="hidden rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-blue-700 shadow-sm sm:block">
                          {browseState.files.length}
                          <br />
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">Previews</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Image className="h-4 w-4 text-slate-500" />
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Media preview</p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                              {browseState.files.length}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            Preview only. Import still uses the selected folder as one source.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
                          onClick={handleViewAllMedia}
                          disabled={browseState.previewLoadingMore || browseState.loading}
                        >
                          {browseState.previewLoadingMore ? 'Loading...' : 'View all'}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {selectedMediaIds.length > 0
                          ? `${selectedMediaIds.length} media selected for manual import.`
                          : 'No media manually selected — importing will include all media in this folder.'}
                      </p>

                      <div
                        className="mt-4 max-h-[46vh] overflow-y-auto pr-1"
                        ref={previewScrollRef}
                        onScroll={(event) => {
                          const target = event.currentTarget;
                          const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 240;
                          if (nearBottom) {
                            loadMorePreviews();
                          }
                        }}
                      >
                        {browseState.files.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                            No media previews found in this location.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                            {browseState.files.map((file) => {
                              const isVideo = file.kind === 'video';
                              const isChecked = selectedMediaSet.has(file.id);

                              return (
                                <article
                                  key={file.id}
                                  className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                    isChecked ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-200'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    aria-label={isChecked ? `Deselect ${file.name}` : `Select ${file.name}`}
                                    className={`absolute right-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border text-white ${
                                      isChecked
                                        ? 'border-blue-600 bg-blue-600'
                                        : 'border-white/70 bg-slate-900/45'
                                    }`}
                                    onClick={() => {
                                      setSelectedMediaIds((current) =>
                                        current.includes(file.id)
                                          ? current.filter((id) => id !== file.id)
                                          : [...current, file.id],
                                      );
                                    }}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <div className={`relative ${isVideo ? 'aspect-[4/3]' : 'aspect-[4/3]'} bg-slate-100`}>
                                    {isVideo ? (
                                      <video
                                        className="h-full w-full object-cover"
                                        src={file.previewUrl}
                                        muted
                                        playsInline
                                        preload="metadata"
                                      />
                                    ) : (
                                      <img className="h-full w-full object-cover" src={file.previewUrl} alt={file.name} loading="lazy" />
                                    )}
                                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-800 shadow-sm backdrop-blur">
                                      {isVideo ? <Play className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
                                      {isVideo ? 'Video' : 'Image'}
                                    </div>
                                    {isVideo ? (
                                      <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-950 shadow-lg ring-8 ring-white/20">
                                        <Play className="ml-0.5 h-5 w-5" />
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex items-start gap-2 p-3">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="truncate text-xs font-bold text-slate-950 sm:text-sm">{file.name}</h4>
                                      <p className="mt-1 text-xs text-slate-500">{isVideo ? 'Video' : 'Image'} · {file.mimeType}</p>
                                    </div>
                                    <button
                                      type="button"
                                      aria-label={`More options for ${file.name}`}
                                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}

                        <div ref={loadMoreSentinelRef} className="h-8" />

                        {browseState.previewLoadingMore ? (
                          <div className="sticky bottom-0 mt-3 flex justify-center border-t border-slate-200 bg-white/95 py-3 backdrop-blur">
                            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading more thumbnails...
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
                      <div className="flex gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                          <Shield className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-black text-slate-950">Safe import behavior</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            The final import only reads files from the selected folder. It will not recursively pull files from child folders.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <footer className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="hidden items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-800 sm:inline-flex"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Need help?
                    </button>

                    <div className="min-w-0 flex-1 sm:max-w-md">
                      <p className="truncate text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Selected folder</p>
                      <p className="truncate text-sm font-black text-slate-950">{selectedFolderName}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        className="hidden h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:block"
                        onClick={onClose}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 sm:px-5"
                        onClick={() => {
                          if (browseState.currentFolder) {
                            void selectFolder(browseState.currentFolder);
                          }
                        }}
                        disabled={!browseState.currentFolder}
                      >
                        <Upload className="h-4 w-4" />
                        <span>
                          Select this folder
                          {selectedMediaIds.length > 0 ? ` (${selectedMediaIds.length} picked)` : ''}
                        </span>
                      </button>
                    </div>
                  </div>
                </footer>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ConfirmModal';
import GalleryCreateAlbumModal from './GalleryCreateAlbumModal';
import GalleryDriveImportSection from './GalleryDriveImportSection';
import GalleryMediaViewer from './GalleryMediaViewer';
import GalleryUnclothySection from './GalleryUnclothySection';
import GalleryUploadDropzone from './GalleryUploadDropzone';
import { GalleryEmptyState, GalleryPageHeader } from './galleryAdminShared';
import {
  GalleryAlbumMovePicker,
  GalleryAlbumsSidebar,
  GalleryAlbumSwitchSheet,
  GalleryCmsHeader,
  GalleryCmsModal,
  GalleryCmsShell,
  GalleryInspectorPanel,
  GalleryMediaGrid,
  GalleryMediaToolbar,
  GalleryMobileTabs,
  GallerySelectionActionsPopup,
} from './cms';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';

function isVideoMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('video/');
}

function getPhotoSearchText(photo) {
  return [photo?.caption, photo?.originalFilename, photo?.sourceId]
    .map((value) => (typeof value === 'string' ? value.toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
}

function getSortTime(photo) {
  const candidate = photo?.uploadedAt || photo?.createdAt || photo?.updatedAt;
  const date = candidate ? new Date(candidate) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

export default function GalleryMediaPanel({ controller, embedded = false }) {
  const {
    albums,
    selectedAlbum,
    selectedAlbumId,
    photos,
    loadingAlbums,
    loadingPhotos,
    uploadingFiles,
    uploadProgress,
    uploadSummary,
    savingAlbum,
    uploadFiles,
    createAlbumRecord,
    loadAlbums,
    deleteSelectedPhotos,
    moveSelectedPhotos,
    moveTargetAlbumId,
    setMoveTargetAlbumId,
    movingPhotos,
    selectedPhotoIds,
    togglePhotoSelect,
    selectPhotoRange,
    clearPhotoSelection,
    setSelectedAlbumId,
  } = controller;

  const selectedCount = selectedPhotoIds.length;
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [createMoveAlbumOpen, setCreateMoveAlbumOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [albumSwitchOpen, setAlbumSwitchOpen] = useState(false);
  const [movePickerOpen, setMovePickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('media');
  const [searchValue, setSearchValue] = useState('');
  const [activeChip, setActiveChip] = useState('all');
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(Boolean(mediaQuery.matches));
    update();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  const chips = useMemo(
    () => [
      { id: 'all', label: 'All' },
      { id: 'images', label: 'Images' },
      { id: 'videos', label: 'Videos' },
      { id: 'recent', label: 'Recent' },
      { id: 'selected', label: `Selected${selectedCount ? ` (${selectedCount})` : ''}` },
    ],
    [selectedCount],
  );

  const selectedPhoto =
    selectedPhotoIds.length === 1 ? photos.find((photo) => photo.id === selectedPhotoIds[0]) ?? null : null;
  const firstSelectedPhoto = useMemo(() => {
    const firstId = selectedPhotoIds[0];
    if (!firstId) return null;
    return photos.find((photo) => photo.id === firstId) ?? null;
  }, [photos, selectedPhotoIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDesktop = window.matchMedia?.('(min-width: 1024px)')?.matches;
    if (isDesktop) return;

    if (activeTab === 'details' && selectedPhotoIds.length !== 1) {
      setActiveTab('media');
    }
  }, [activeTab, selectedPhotoIds.length]);

  const albumCountLabel = useMemo(() => {
    if (!selectedAlbum) return null;
    const count =
      typeof selectedAlbum?._count?.photos === 'number'
        ? selectedAlbum._count.photos
        : typeof selectedAlbum.photoCount === 'number'
          ? selectedAlbum.photoCount
          : typeof selectedAlbum.mediaCount === 'number'
            ? selectedAlbum.mediaCount
            : typeof selectedAlbum.count === 'number'
              ? selectedAlbum.count
              : null;
    return typeof count === 'number' ? `${count} items` : null;
  }, [selectedAlbum]);

  const moveTargetAlbumName = useMemo(() => {
    if (!moveTargetAlbumId) return null;
    const match = Array.isArray(albums) ? albums.find((album) => album.id === moveTargetAlbumId) : null;
    return match?.name ?? null;
  }, [albums, moveTargetAlbumId]);

  const filteredPhotos = useMemo(() => {
    const list = Array.isArray(photos) ? photos : [];
    const query = searchValue.trim().toLowerCase();

    let next = list;

    if (activeChip === 'images') {
      next = next.filter((photo) => !isVideoMime(photo.mimeType));
    } else if (activeChip === 'videos') {
      next = next.filter((photo) => isVideoMime(photo.mimeType));
    } else if (activeChip === 'selected') {
      const selectedSet = new Set(selectedPhotoIds);
      next = next.filter((photo) => selectedSet.has(photo.id));
    }

    if (query) {
      next = next.filter((photo) => getPhotoSearchText(photo).includes(query));
    }

    if (activeChip === 'recent') {
      next = [...next].sort((a, b) => getSortTime(b) - getSortTime(a));
    }

    return next;
  }, [activeChip, photos, searchValue, selectedPhotoIds]);

  const handleOpenUpload = () => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)')?.matches) {
      setUploadOpen(true);
      return;
    }
    setActiveTab('upload');
  };

  const handleOpenImport = () => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)')?.matches) {
      setImportOpen(true);
      return;
    }
    setActiveTab('upload');
  };

  const handleOpenFilter = () => {
    toast.message('Filters are handled via the chip row for now.');
  };

  return (
    <div className={embedded ? '' : 'space-y-6'}>
      <ConfirmModal
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete ${selectedCount} selected media item${selectedCount === 1 ? '' : 's'}?`}
        description="This action cannot be undone."
        confirmLabel={selectedCount === 1 ? 'Delete item' : `Delete ${selectedCount} items`}
        cancelLabel="Keep item"
        acknowledgementLabel="I understand this will permanently remove the selected item from the album."
        acknowledgementRequired={false}
        acknowledgementDefaultChecked
        loading={confirmingDelete}
        destructive
        onConfirm={async () => {
          try {
            setConfirmingDelete(true);
            await deleteSelectedPhotos({ skipConfirm: true });
            setConfirmDeleteOpen(false);
          } finally {
            setConfirmingDelete(false);
          }
        }}
      >
        {selectedCount === 1 && firstSelectedPhoto ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Selected item
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
                <MediaPreview
                  url={firstSelectedPhoto.imageUrl}
                  mimeType={firstSelectedPhoto.mimeType}
                  sourceType={firstSelectedPhoto.sourceType}
                  sourceId={firstSelectedPhoto.sourceId}
                  alt={firstSelectedPhoto.caption || firstSelectedPhoto.originalFilename || `media_${firstSelectedPhoto.id}`}
                  className="h-full w-full object-cover"
                  controls={false}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                  {firstSelectedPhoto.originalFilename || firstSelectedPhoto.caption || `media_${firstSelectedPhoto.id}`}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedAlbum?.name}</p>
              </div>
            </div>
          </div>
        ) : null}
      </ConfirmModal>

      <GalleryCreateAlbumModal
        open={createAlbumOpen}
        onOpenChange={setCreateAlbumOpen}
        loading={savingAlbum}
        onCreate={async (albumData) => {
          const created = await createAlbumRecord(albumData);
          if (!created) {
            return null;
          }

          await loadAlbums();
          setSelectedAlbumId(created.id);
          return created;
        }}
      />

      <GalleryCreateAlbumModal
        open={createMoveAlbumOpen}
        onOpenChange={setCreateMoveAlbumOpen}
        loading={savingAlbum}
        title="Create album for move"
        description="Create a destination album without leaving the current media workflow. The new album will be selected as the move target."
        confirmLabel="Create album"
        onCreate={async (albumData) => {
          const created = await createAlbumRecord(albumData);
          if (!created) {
            return null;
          }

          await loadAlbums();
          setMoveTargetAlbumId(created.id);
          return created;
        }}
      />

      {!embedded ? (
        <GalleryPageHeader
          eyebrow="Media Intake"
          title="Media"
          description="Upload files and review the current album's intake list from one focused page."
        />
      ) : null}

      <GalleryCmsShell
        embedded={embedded}
        header={
          <GalleryCmsHeader
            albumName={selectedAlbum?.name || 'Media'}
            albumCountLabel={albumCountLabel}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onOpenFilter={handleOpenFilter}
            onOpenImport={handleOpenImport}
            onOpenUpload={handleOpenUpload}
          />
        }
        sidebar={
          <GalleryAlbumsSidebar
            albums={albums}
            selectedAlbumId={selectedAlbumId}
            loadingAlbums={loadingAlbums}
            onSelectAlbum={(albumId) => {
              setSelectedAlbumId(albumId);
              setAlbumSwitchOpen(false);
              setActiveTab('media');
            }}
            onCreateAlbumClick={() => setCreateAlbumOpen(true)}
            mobileAlbumName={selectedAlbum?.name}
            mobileAlbumCountLabel={albumCountLabel}
            onMobileOpenFilter={handleOpenFilter}
            onMobileOpenSwitch={() => setAlbumSwitchOpen(true)}
            onMobileOpenImport={() => setActiveTab('upload')}
            onMobileFocusSearch={() => {
              setActiveTab('media');
              setTimeout(() => {
                if (typeof document === 'undefined') return;
                document.getElementById('gallery-media-search')?.focus();
              }, 40);
            }}
          />
        }
        mobileTabs={<GalleryMobileTabs activeTab={activeTab} onChange={setActiveTab} />}
        main={
          <main className="min-w-0 bg-white dark:bg-slate-900">
            <section className={`${activeTab !== 'media' ? 'hidden lg:block' : ''}`}>
              <GalleryMediaToolbar
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                activeChip={activeChip}
                chips={chips}
                onChipChange={setActiveChip}
                onOpenFilter={handleOpenFilter}
              />

              {loadingPhotos ? (
                <div className="px-4 pb-6 sm:px-5 lg:px-6">
                  <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
                    Loading media...
                  </div>
                </div>
              ) : !selectedAlbum ? (
                <div className="px-4 pb-6 sm:px-5 lg:px-6">
                  <GalleryEmptyState
                    title="No album selected"
                    description="Pick an album from the left rail to open its intake workspace."
                  />
                </div>
              ) : (
                <GalleryMediaGrid
                  photos={filteredPhotos}
                  albumName={selectedAlbum?.name}
                  selectedPhotoIds={selectedPhotoIds}
                  togglePhotoSelect={togglePhotoSelect}
                  selectPhotoRange={selectPhotoRange}
                  onOpenPreview={(photo) => setPreviewPhoto(photo)}
                  emptyState={
                    photos.length === 0 ? (
                      <GalleryEmptyState
                        title="No media yet"
                        description="Upload files or import Google Drive items to populate this album."
                      />
                    ) : (
                      <GalleryEmptyState title="No matches" description="Try clearing search or switching filters." />
                    )
                  }
                />
              )}
            </section>

            {activeTab === 'upload' ? (
              <section className="space-y-4 px-4 py-4 sm:px-5 lg:hidden">
                <GalleryUploadDropzone
                  uploading={uploadingFiles}
                  uploadProgress={uploadProgress}
                  uploadSummary={uploadSummary}
                  onUploadFiles={uploadFiles}
                  title="Upload media"
                  description="Drag files or choose files from your device."
                  helpText="Batch uploads go straight into the selected album."
                  uploadLabel="Choose files"
                  buttonTone="primary"
                />

                <GalleryDriveImportSection controller={controller} selectedAlbum={selectedAlbum} variant="compact" />
              </section>
            ) : null}

            {activeTab === 'details' ? (
              <section className="space-y-4 px-4 py-4 sm:px-5 lg:hidden">
                {selectedPhoto ? (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                          Details
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {selectedPhoto.caption || selectedPhoto.originalFilename || `media_${selectedPhoto.id}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearPhotoSelection}
                        className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                      >
                        Close
                      </button>
                    </div>

                    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                      <div className="aspect-[4/5]">
                        <MediaPreview
                          url={selectedPhoto.imageUrl}
                          mimeType={selectedPhoto.mimeType}
                          sourceType={selectedPhoto.sourceType}
                          sourceId={selectedPhoto.sourceId}
                          alt={selectedPhoto.caption || `media_${selectedPhoto.id}`}
                          className="h-full w-full object-contain"
                          controls={false}
                        />
                      </div>
                      <div className="border-t border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        {selectedAlbum?.name}
                      </div>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                        Quick info
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400">Type</span>
                          <span className="truncate font-medium text-slate-900 dark:text-slate-50">
                            {selectedPhoto.mimeType || '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-500 dark:text-slate-400">Source</span>
                          <span className="truncate font-medium text-slate-900 dark:text-slate-50">
                            {selectedPhoto.sourceType || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <GalleryUnclothySection
                        controller={controller}
                        selectedAlbum={selectedAlbum}
                        photo={selectedPhoto}
                        album={selectedAlbum}
                        showPreview={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[28px] border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    Select exactly one media item to see details.
                  </div>
                )}
              </section>
            ) : null}
          </main>
        }
        inspector={
          <GalleryInspectorPanel photo={selectedPhoto} album={selectedAlbum} onClose={clearPhotoSelection}>
            <GalleryUnclothySection
              controller={controller}
              selectedAlbum={selectedAlbum}
              photo={selectedPhoto}
              album={selectedAlbum}
              showPreview={false}
            />
          </GalleryInspectorPanel>
        }
        mobileFooterActions={
          null
        }
      />

      <GallerySelectionActionsPopup
        open={selectedCount > 0}
        selectedCount={selectedCount}
        disabled={confirmingDelete || movingPhotos}
        targetAlbumName={moveTargetAlbumName}
        onPickAlbum={() => setMovePickerOpen(true)}
        onMove={() => {
          if (!moveTargetAlbumId || moveTargetAlbumId === selectedAlbumId) return;
          void moveSelectedPhotos();
        }}
        onCreateAlbum={() => setCreateMoveAlbumOpen(true)}
        onDelete={() => setConfirmDeleteOpen(true)}
        onClear={clearPhotoSelection}
      />

      <GalleryCmsModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload media"
        description={selectedAlbum ? `Uploads go directly into ${selectedAlbum.name}.` : 'Select an album to upload media.'}
      >
        <GalleryUploadDropzone
          uploading={uploadingFiles}
          uploadProgress={uploadProgress}
          uploadSummary={uploadSummary}
          onUploadFiles={uploadFiles}
          title="Upload media"
          description="Drag files or choose files from your device."
          helpText="Batch uploads go straight into the selected album."
          uploadLabel="Choose files"
        />
      </GalleryCmsModal>

      <GalleryCmsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import from Google Drive"
        description={selectedAlbum ? `Import directly into ${selectedAlbum.name}.` : 'Select an album to import media.'}
      >
        <GalleryDriveImportSection controller={controller} selectedAlbum={selectedAlbum} />
      </GalleryCmsModal>

      <GalleryCmsModal
        open={albumSwitchOpen && isDesktop}
        onClose={() => setAlbumSwitchOpen(false)}
        title="Switch album"
        description="Choose the active album for uploads, imports, and media selection."
      >
        {/* Desktop fallback (mobile uses bottom sheet) */}
        <div className="hidden space-y-2 lg:block">
          {Array.isArray(albums) && albums.length > 0 ? (
            albums.map((album) => (
              <button
                key={album.id}
                type="button"
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                  album.id === selectedAlbumId
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-50 dark:bg-slate-50 dark:text-slate-900'
                    : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50'
                }`}
                onClick={() => {
                  setSelectedAlbumId(album.id);
                  setAlbumSwitchOpen(false);
                }}
              >
                {album.name}
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
              No albums available yet.
            </div>
          )}

          <button
            type="button"
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm dark:bg-slate-50 dark:text-slate-900"
            onClick={() => {
              setAlbumSwitchOpen(false);
              setCreateAlbumOpen(true);
            }}
          >
            Create new album
          </button>
        </div>
      </GalleryCmsModal>

      <GalleryAlbumMovePicker
        open={movePickerOpen}
        onClose={() => setMovePickerOpen(false)}
        albums={albums}
        excludedAlbumId={selectedAlbumId}
        selectedAlbumId={moveTargetAlbumId}
        onConfirm={(albumId) => {
          setMoveTargetAlbumId(albumId);
          setMovePickerOpen(false);
        }}
        onCreateNew={() => {
          setMovePickerOpen(false);
          setCreateMoveAlbumOpen(true);
        }}
      />

      <GalleryAlbumSwitchSheet
        open={albumSwitchOpen && !isDesktop}
        onClose={() => setAlbumSwitchOpen(false)}
        albums={albums}
        selectedAlbumId={selectedAlbumId}
        onConfirm={(albumId) => {
          setSelectedAlbumId(albumId);
          setAlbumSwitchOpen(false);
          setActiveTab('media');
        }}
        onCreateNew={() => setCreateAlbumOpen(true)}
      />

      <GalleryMediaViewer open={Boolean(previewPhoto)} photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />
    </div>
  );
}

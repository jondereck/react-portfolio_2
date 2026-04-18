'use client';

import { useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ConfirmModal';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import GalleryMediaViewer from './GalleryMediaViewer';
import {
  GalleryAlbumPicker,
  GalleryEmptyState,
  GalleryPageHeader,
  GalleryPanelCard,
} from './galleryAdminShared';
import GalleryUploadDropzone from './GalleryUploadDropzone';

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
    uploadFiles,
    deleteSelectedPhotos,
    selectedPhotoIds,
    togglePhotoSelect,
    clearPhotoSelection,
    setSelectedAlbumId,
  } = controller;
  const selectedCount = selectedPhotoIds.length;
  const showSelectionBar = selectedCount > 0;
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className={`space-y-6 ${showSelectionBar ? 'pb-36 sm:pb-28' : ''}`}>
      <ConfirmModal
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete ${selectedCount} selected media item${selectedCount === 1 ? '' : 's'}?`}
        description="This action cannot be undone."
        confirmLabel={selectedCount === 1 ? 'Delete item' : `Delete ${selectedCount} items`}
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
      />

      {!embedded ? (
        <GalleryPageHeader
          eyebrow="Media Intake"
          title="Media"
          description="Upload files and review the current album's intake list from one focused page."
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <GalleryAlbumPicker
          albums={albums}
          selectedAlbumId={selectedAlbumId}
          loadingAlbums={loadingAlbums}
          onSelectAlbum={setSelectedAlbumId}
          emptyDescription="Create an album first so media can be ingested into a target collection."
        />

        {selectedAlbum ? (
          <div className="space-y-6">
            <GalleryPanelCard
              title={`Intake for ${selectedAlbum.name}`}
              description="This page stays scoped to media ingestion only."
            >
              <GalleryUploadDropzone
                uploading={uploadingFiles}
                uploadProgress={uploadProgress}
                uploadSummary={uploadSummary}
                onUploadFiles={uploadFiles}
                title="Upload media"
                description="Drag and drop images or videos here, or choose files from your device."
                helpText="Batch uploads go straight into the selected album."
                uploadLabel="Choose files"
              />
            </GalleryPanelCard>

            <GalleryPanelCard
              title="Selected album media"
              description="Review the current album's intake list and manage individual items."
              className={showSelectionBar ? 'pb-28 sm:pb-8' : ''}
            >
              {loadingPhotos ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading media...</p>
              ) : photos.length === 0 ? (
                <GalleryEmptyState
                  title="No media yet"
                  description="Upload files or drop media into this album to populate it."
                />
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                  {photos.map((photo) => (
                    <article
                      key={photo.id}
                      className={`relative overflow-hidden rounded-2xl border bg-slate-50 p-2 dark:bg-slate-950/40 sm:p-4 ${
                        selectedPhotoIds.includes(photo.id)
                          ? 'border-sky-500 ring-2 ring-sky-200 dark:border-sky-400 dark:ring-sky-900/40'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() => setPreviewPhoto(photo)}
                        aria-label={`View ${photo.caption || `media ${photo.id}`}`}
                      >
                        <div className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                          <MediaPreview
                            url={photo.imageUrl}
                            sourceType={photo.sourceType}
                            sourceId={photo.sourceId}
                            alt={photo.caption || `Media ${photo.id}`}
                            className="h-full w-full object-contain"
                            controls={false}
                          />
                        </div>
                      </button>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedPhotoIds.includes(photo.id)}
                            onChange={(event) => {
                              togglePhotoSelect(photo.id, { shiftKey: event.shiftKey });
                            }}
                            aria-label={`Select media ${photo.caption || photo.id}`}
                          />
                          Select
                          {selectedPhotoIds.includes(photo.id) ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white">
                              <Check className="size-3" />
                              Selected
                            </span>
                          ) : null}
                        </label>
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100 sm:text-sm">
                          {photo.caption || 'Untitled media'}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {showSelectionBar ? (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-10px_30px_-18px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
                  <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {selectedCount} media item{selectedCount === 1 ? '' : 's'} selected
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Use delete to remove all checked items at once.
                      </p>
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap">
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-12 flex-1 sm:h-10 sm:flex-none"
                        onClick={() => setConfirmDeleteOpen(true)}
                        disabled={confirmingDelete}
                      >
                        <Trash2 className="size-4" />
                        Delete selected
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 flex-1 sm:h-10 sm:flex-none"
                        onClick={clearPhotoSelection}
                      >
                        <X className="size-4" />
                        Clear selection
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <GalleryMediaViewer
                open={Boolean(previewPhoto)}
                photo={previewPhoto}
                onClose={() => setPreviewPhoto(null)}
              />
            </GalleryPanelCard>
          </div>
        ) : (
          <GalleryPanelCard title="Select an album" description="Choose an album to start uploading and adding media.">
            <GalleryEmptyState
              title="No album selected"
              description="Pick an album from the left rail to open its intake workspace."
            />
          </GalleryPanelCard>
        )}
      </div>
    </div>
  );
}

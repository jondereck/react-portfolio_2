'use client';

import { useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import {
  GalleryAlbumPicker,
  GalleryEmptyState,
  GalleryPageHeader,
  GalleryPanelCard,
} from './galleryAdminShared';
import GalleryUploadDropzone from './GalleryUploadDropzone';

export default function GalleryMediaPanel({ controller }) {
  const {
    albums,
    selectedAlbum,
    selectedAlbumId,
    photos,
    loadingAlbums,
    loadingPhotos,
    uploadingFiles,
    uploadProgress,
    uploadFiles,
    deletePhoto,
    deleteSelectedPhotos,
    selectedPhotoIds,
    togglePhotoSelect,
    clearPhotoSelection,
    setSelectedAlbumId,
  } = controller;
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const selectedCount = selectedPhotoIds.length;

  return (
    <div className="space-y-6">
      <GalleryPageHeader
        eyebrow="Media Intake"
        title="Media"
        description="Upload files and review the current album's intake list from one focused page."
      />

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
            >
              {selectedCount > 0 ? (
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/40 dark:bg-sky-950/20 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">
                      {selectedCount} media item{selectedCount === 1 ? '' : 's'} selected
                    </p>
                    <p className="mt-1 text-xs text-sky-700 dark:text-sky-300">
                      Use the delete action to remove all checked items at once.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-sky-300 bg-white px-3 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-sky-950/40"
                      onClick={() => setBulkDeleteOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete selected
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={clearPhotoSelection}
                    >
                      <X className="size-4" />
                      Clear selection
                    </button>
                  </div>
                </div>
              ) : null}

              {loadingPhotos ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading media...</p>
              ) : photos.length === 0 ? (
                <GalleryEmptyState
                  title="No media yet"
                  description="Upload files or drop media into this album to populate it."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {photos.map((photo) => (
                    <article
                      key={photo.id}
                      className={`relative overflow-hidden rounded-2xl border bg-slate-50 p-3 dark:bg-slate-950/40 sm:p-4 ${
                        selectedPhotoIds.includes(photo.id)
                          ? 'border-sky-500 ring-2 ring-sky-200 dark:border-sky-400 dark:ring-sky-900/40'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {selectedPhotoIds.includes(photo.id) ? (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                          <Check className="size-3.5" />
                          Selected
                        </span>
                      ) : null}
                      <label className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/95 px-2 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
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
                      </label>
                      <div className="aspect-[5/4] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 sm:aspect-[4/3]">
                        <MediaPreview
                          url={photo.imageUrl}
                          alt={photo.caption || `Media ${photo.id}`}
                          className="h-full w-full object-contain"
                          controls={false}
                        />
                      </div>
                      <p className="mt-3 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {photo.caption || 'Untitled media'}
                      </p>
                      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                        <button
                          type="button"
                          className="w-full rounded-md border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30 sm:w-auto sm:px-2 sm:py-1"
                          onClick={() => deletePhoto(photo.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {bulkDeleteOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Delete selected media?</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      This will permanently remove {selectedCount} selected media item{selectedCount === 1 ? '' : 's'} from the album.
                    </p>
                    <div className="mt-5 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        className="h-10 rounded-md border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => setBulkDeleteOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-500"
                        onClick={async () => {
                          setBulkDeleteOpen(false);
                          await deleteSelectedPhotos();
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete now
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
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

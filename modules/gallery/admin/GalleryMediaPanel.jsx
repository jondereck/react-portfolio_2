'use client';

import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import {
  GalleryAlbumPicker,
  GalleryEmptyState,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  inputStyles,
} from './galleryAdminShared';

export default function GalleryMediaPanel({ controller }) {
  const {
    albums,
    selectedAlbum,
    selectedAlbumId,
    photos,
    loadingAlbums,
    loadingPhotos,
    photoForm,
    setPhotoForm,
    savingPhoto,
    uploadingFiles,
    addPhoto,
    bulkUpload,
    deletePhoto,
    setSelectedAlbumId,
  } = controller;

  return (
    <div className="space-y-6">
      <GalleryPageHeader
        eyebrow="Media Intake"
        title="Media"
        description="Upload files, add remote URLs, and review the current album's intake list from one focused page."
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
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Upload files</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Batch upload images and videos into the selected album.</p>
                  <input
                    className="w-full text-sm"
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    disabled={uploadingFiles}
                    onChange={bulkUpload}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {uploadingFiles ? 'Uploading files...' : 'Existing upload API flow preserved.'}
                  </p>
                </div>

                <form className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" onSubmit={addPhoto}>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add media URL</p>
                  <input
                    className={inputStyles}
                    placeholder="https://..."
                    value={photoForm.imageUrl}
                    onChange={(event) => setPhotoForm((previous) => ({ ...previous, imageUrl: event.target.value }))}
                    required
                  />
                  <input
                    className={inputStyles}
                    placeholder="Caption"
                    value={photoForm.caption}
                    onChange={(event) => setPhotoForm((previous) => ({ ...previous, caption: event.target.value }))}
                  />
                  <input
                    className={inputStyles}
                    type="date"
                    value={photoForm.dateTaken}
                    onChange={(event) => setPhotoForm((previous) => ({ ...previous, dateTaken: event.target.value }))}
                  />
                  <button className={`${buttonStyles} w-full`} disabled={savingPhoto}>
                    {savingPhoto ? 'Adding...' : 'Add Media'}
                  </button>
                </form>
              </div>
            </GalleryPanelCard>

            <GalleryPanelCard
              title="Selected album media"
              description="Review the current album's intake list and manage individual items."
            >
              {loadingPhotos ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading media...</p>
              ) : photos.length === 0 ? (
                <GalleryEmptyState
                  title="No media yet"
                  description="Upload files or add a remote URL to populate this album."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {photos.map((photo) => (
                    <article
                      key={photo.id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40"
                    >
                      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <MediaPreview
                          url={photo.imageUrl}
                          alt={photo.caption || `Media ${photo.id}`}
                          className="h-full w-full object-contain"
                          controls={false}
                        />
                      </div>
                      <p className="mt-3 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {photo.caption || 'Untitled media'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{photo.sourceType}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                          onClick={() => deletePhoto(photo.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
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

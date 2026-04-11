'use client';

import AdminStatusBadge from '@/components/admin/shared/AdminStatusBadge';
import {
  GalleryEmptyState,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  ghostButtonStyles,
  inputStyles,
} from './galleryAdminShared';

export default function GalleryAlbumsPanel({ controller }) {
  const {
    albums,
    selectedAlbum,
    loadingAlbums,
    albumForm,
    setAlbumForm,
    savingAlbum,
    createAlbum,
    deleteAlbum,
    setSelectedAlbumId,
  } = controller;

  return (
    <div className="space-y-6">
      <GalleryPageHeader
        eyebrow="Album Management"
        title="Albums"
        description="Create, select, publish, and remove albums from a dedicated management view."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <GalleryPanelCard
            title="Create album"
            description="Create a new album without exposing media intake or ordering tools."
          >
            <form className="space-y-3" onSubmit={createAlbum}>
              <input
                className={inputStyles}
                placeholder="Album name"
                value={albumForm.name}
                onChange={(event) => setAlbumForm((previous) => ({ ...previous, name: event.target.value }))}
                required
              />
              <input
                className={inputStyles}
                placeholder="Slug (optional)"
                value={albumForm.slug}
                onChange={(event) => setAlbumForm((previous) => ({ ...previous, slug: event.target.value }))}
              />
              <textarea
                className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                rows={4}
                placeholder="Description"
                value={albumForm.description}
                onChange={(event) => setAlbumForm((previous) => ({ ...previous, description: event.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={albumForm.isPublished}
                  onChange={(event) => setAlbumForm((previous) => ({ ...previous, isPublished: event.target.checked }))}
                />
                Publish immediately
              </label>
              <button className={`${buttonStyles} w-full`} disabled={savingAlbum}>
                {savingAlbum ? 'Creating...' : 'Create Album'}
              </button>
            </form>
          </GalleryPanelCard>

          <GalleryPanelCard
            title="Album list"
            description="Select the working album or remove an album from the library."
          >
            {loadingAlbums ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading albums...</p> : null}

            {!loadingAlbums && albums.length === 0 ? (
              <GalleryEmptyState
                title="No albums yet"
                description="Create your first album to start organizing gallery content."
              />
            ) : (
              <div className="space-y-2">
                {albums.map((album) => {
                  const isActive = selectedAlbum?.id === album.id;

                  return (
                    <button
                      key={album.id}
                      type="button"
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-slate-900 bg-slate-100 dark:border-slate-100 dark:bg-slate-800'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                      }`}
                      onClick={() => setSelectedAlbumId(album.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{album.name}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {album._count?.photos ?? 0} media item{(album._count?.photos ?? 0) === 1 ? '' : 's'}
                          </p>
                        </div>
                        <AdminStatusBadge label={album.isPublished ? 'Published' : 'Draft'} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </GalleryPanelCard>
        </div>

        <div className="space-y-6">
          <GalleryPanelCard
            title="Current album"
            description="Review the selected album's state before moving into media, arrange, import, or settings pages."
          >
            {selectedAlbum ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{selectedAlbum.name}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {selectedAlbum._count?.photos ?? 0} media item{(selectedAlbum._count?.photos ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <AdminStatusBadge label={selectedAlbum.isPublished ? 'Published' : 'Draft'} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slug</p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {selectedAlbum.slug ? `/gallery/${selectedAlbum.slug}` : 'Generated when saved'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cover state</p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {selectedAlbum.coverPhotoId ? 'Cover photo assigned' : 'No cover photo selected'}
                    </p>
                  </div>
                </div>

                {selectedAlbum.description ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{selectedAlbum.description}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className={ghostButtonStyles} onClick={() => deleteAlbum(selectedAlbum.id)}>
                    Delete Album
                  </button>
                </div>
              </div>
            ) : (
              <GalleryEmptyState
                title="Select an album"
                description="Choose an album from the list to review its cover and publish state."
              />
            )}
          </GalleryPanelCard>
        </div>
      </div>
    </div>
  );
}

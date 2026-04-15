'use client';

import AdminStatusBadge from '@/components/admin/shared/AdminStatusBadge';
import { toast } from 'sonner';
import { formatLocalDate } from '@/app/admin/gallery/utils';
import {
  GalleryAlbumPicker,
  GalleryEmptyState,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  inputStyles,
} from './galleryAdminShared';

export default function GallerySettingsPanel({ controller }) {
  const {
    albums,
    selectedAlbum,
    selectedAlbumId,
    loadingAlbums,
    loadingPhotos,
    photos,
    detailsForm,
    setDetailsForm,
    detailsDirty,
    setDetailsDirty,
    savingDetails,
    saveAlbumDetails,
    setCoverPhoto,
    setSelectedAlbumId,
  } = controller;

  const shareLink = selectedAlbum?.shareLinkEnabled && selectedAlbum?.shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/gallery/${selectedAlbum.slug}?share=${selectedAlbum.shareToken}`
    : '';

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success('Share link copied');
    } catch {
      toast.error('Unable to copy share link');
    }
  };

  return (
    <div className="space-y-6">
      <GalleryPageHeader
        eyebrow="Gallery Settings"
        title="Settings"
        description="Edit album metadata, publish state, share-link access, and cover-photo assignment in a settings-only view."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <GalleryAlbumPicker
          albums={albums}
          selectedAlbumId={selectedAlbumId}
          loadingAlbums={loadingAlbums}
          onSelectAlbum={setSelectedAlbumId}
          emptyDescription="Create an album first so there is something to configure."
        />

        {selectedAlbum ? (
          <div className="space-y-6">
            <GalleryPanelCard
              title={`Album settings for ${selectedAlbum.name}`}
              description="This page is limited to album metadata and cover selection."
            >
              <form className="grid gap-4 lg:grid-cols-2" onSubmit={saveAlbumDetails}>
                <div className="space-y-3">
                  <input
                    className={inputStyles}
                    value={detailsForm.name}
                    onChange={(event) => {
                      setDetailsForm((previous) => ({ ...previous, name: event.target.value }));
                      setDetailsDirty(true);
                    }}
                    placeholder="Album name"
                    required
                  />
                  <input
                    className={inputStyles}
                    value={detailsForm.slug}
                    onChange={(event) => {
                      setDetailsForm((previous) => ({ ...previous, slug: event.target.value }));
                      setDetailsDirty(true);
                    }}
                    placeholder="album-slug"
                  />
                  <textarea
                    className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                    value={detailsForm.description}
                    onChange={(event) => {
                      setDetailsForm((previous) => ({ ...previous, description: event.target.value }));
                      setDetailsDirty(true);
                    }}
                    placeholder="Album description"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={detailsForm.isPublished}
                      onChange={(event) => {
                        setDetailsForm((previous) => ({ ...previous, isPublished: event.target.checked }));
                        setDetailsDirty(true);
                      }}
                    />
                    Published
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={detailsForm.shareLinkEnabled}
                      onChange={(event) => {
                        setDetailsForm((previous) => ({ ...previous, shareLinkEnabled: event.target.checked }));
                        setDetailsDirty(true);
                      }}
                    />
                    Enable share link
                  </label>
                  <button className={buttonStyles} disabled={!detailsDirty || savingDetails}>
                    {savingDetails ? 'Saving...' : 'Save settings'}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current state</p>
                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                          {selectedAlbum._count?.photos ?? photos.length} media item{(selectedAlbum._count?.photos ?? photos.length) === 1 ? '' : 's'}
                        </p>
                      </div>
                      <AdminStatusBadge label={selectedAlbum.isPublished ? 'Published' : 'Draft'} />
                    </div>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      {selectedAlbum.coverPhotoId ? 'A cover photo is already assigned.' : 'No cover photo has been assigned yet.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Share link</p>
                    {selectedAlbum.shareLinkEnabled && selectedAlbum.shareToken ? (
                      <div className="mt-2 space-y-3">
                        <input
                          className={inputStyles}
                          readOnly
                          value={shareLink}
                          onFocus={(event) => event.currentTarget.select()}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className={buttonStyles} onClick={handleCopyShareLink}>
                            Copy link
                          </button>
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                            Enabled
                          </span>
                        </div>
                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                          Share links work even when the album is unpublished. Disable sharing to revoke this URL.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Sharing is disabled. Turn it on to generate a private share link.
                        </p>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                          Disabled
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </GalleryPanelCard>

            <GalleryPanelCard
              title="Cover photo selection"
              description="Choose a media item to serve as the album cover."
            >
              {loadingPhotos ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading media...</p>
              ) : photos.length === 0 ? (
                <GalleryEmptyState
                  title="No media available"
                  description="Add media first so a cover photo can be selected here."
                />
              ) : (
                <div className="max-h-[34rem] overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="grid gap-3 border-b border-slate-200 px-3 py-3 text-xs last:border-b-0 dark:border-slate-700 sm:flex sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{photo.caption || `Photo #${photo.id}`}</p>
                        <p className="text-slate-500 dark:text-slate-400">
                          {photo.sourceType} | {formatLocalDate(photo.dateTaken || photo.uploadedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-[11px] font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800 sm:w-auto sm:px-2 sm:py-1"
                        onClick={() => setCoverPhoto(photo.id)}
                      >
                        {selectedAlbum.coverPhotoId === photo.id ? 'Cover' : 'Set Cover'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GalleryPanelCard>
          </div>
        ) : (
          <GalleryPanelCard title="Select an album" description="Choose an album to edit settings.">
            <GalleryEmptyState title="No album selected" description="Settings remain hidden until a target album is selected." />
          </GalleryPanelCard>
        )}
      </div>
    </div>
  );
}

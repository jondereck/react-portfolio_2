'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminStatusBadge from '@/components/admin/shared/AdminStatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import {
  GalleryAlbumPicker,
  GalleryEmptyState,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  ghostButtonStyles,
  inputStyles,
} from './galleryAdminShared';

export default function GalleryAlbumsPanel({ controller, embedded = false }) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState('');
  const platformOptions = useMemo(
    () => [
      { value: 'instagram', label: 'Instagram' },
      { value: 'facebook', label: 'Facebook' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'youtube', label: 'YouTube' },
      { value: 'x', label: 'X' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'website', label: 'Website' },
      { value: 'other', label: 'Other' },
    ],
    [],
  );
  const {
    albums,
    selectedAlbum,
    selectedAlbumId,
    loadingAlbums,
    photos,
    albumForm,
    setAlbumForm,
    savingAlbum,
    detailsForm,
    setDetailsForm,
    detailsDirty,
    setDetailsDirty,
    savingDetails,
    createAlbum,
    deleteAlbum,
    saveAlbumDetails,
    setSelectedAlbumId,
  } = controller;

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  const selectedShareLink = useMemo(
    () =>
      selectedAlbum?.shareLinkEnabled && selectedAlbum?.shareToken
        ? `${siteOrigin}/gallery/${selectedAlbum.slug}?share=${selectedAlbum.shareToken}`
        : '',
    [selectedAlbum, siteOrigin],
  );

  const profileLinks = Array.isArray(detailsForm?.profileLinks) ? detailsForm.profileLinks : [];

  const isValidHttpUrl = (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;

    try {
      // eslint-disable-next-line no-new
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete ${selectedAlbum?.name || 'album'}?`}
        description="This will delete the album and all media in it. This action cannot be undone."
        confirmLabel="Delete album"
        destructive
        onConfirm={async () => {
          if (!selectedAlbum) return;
          await deleteAlbum(selectedAlbum.id, { skipConfirm: true });
          setConfirmDeleteOpen(false);
        }}
      />

      {!embedded ? (
        <GalleryPageHeader
          eyebrow="Album Management"
          title="Albums"
          description="Create albums, switch with the shared picker, and rename the selected album from one focused view."
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
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

          <GalleryAlbumPicker
            albums={albums}
            selectedAlbumId={selectedAlbumId}
            loadingAlbums={loadingAlbums}
            onSelectAlbum={setSelectedAlbumId}
            emptyDescription="Create your first album to start organizing gallery content."
          />
        </div>

        <div className="space-y-6">
          <GalleryPanelCard
            title={selectedAlbum ? `Manage ${selectedAlbum.name}` : 'Current album'}
            description="Update the selected album name, metadata, publish state, or delete it entirely."
          >
            {selectedAlbum ? (
              <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]" onSubmit={saveAlbumDetails}>
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
                    rows={4}
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

                  <div className="flex flex-wrap items-center gap-2">
                    <button className={buttonStyles} disabled={!detailsDirty || savingDetails}>
                      {savingDetails ? 'Saving...' : 'Save album'}
                    </button>
                    <button type="button" className={ghostButtonStyles} onClick={() => setConfirmDeleteOpen(true)}>
                      Delete Album
                    </button>
                  </div>
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
                  </div>

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

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Profile links</p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Add social/profile links associated with this album.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={ghostButtonStyles}
                        disabled={profileLinks.length >= 12}
                        onClick={() => {
                          if (profileLinks.length >= 12) return;
                          setDetailsForm((previous) => ({
                            ...previous,
                            profileLinks: [...profileLinks, { platform: 'instagram', url: '' }],
                          }));
                          setDetailsDirty(true);
                        }}
                      >
                        Add link
                      </button>
                    </div>

                    {profileLinks.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No links saved.</p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {profileLinks.map((link, index) => {
                          const urlValue = typeof link?.url === 'string' ? link.url : '';
                          const hasUrl = urlValue.trim().length > 0;
                          const urlValid = !hasUrl || isValidHttpUrl(urlValue);

                          return (
                            <div
                              key={`${link?.platform ?? 'link'}-${index}`}
                              className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
                            >
                              <div className="grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)_auto] sm:items-start">
                                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Platform
                                  <select
                                    className={inputStyles}
                                    value={link?.platform ?? 'instagram'}
                                    onChange={(event) => {
                                      const nextPlatform = event.target.value;
                                      setDetailsForm((previous) => ({
                                        ...previous,
                                        profileLinks: profileLinks.map((entry, entryIndex) =>
                                          entryIndex === index ? { ...entry, platform: nextPlatform } : entry,
                                        ),
                                      }));
                                      setDetailsDirty(true);
                                    }}
                                  >
                                    {platformOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  URL
                                  <input
                                    className={`${inputStyles} ${urlValid ? '' : 'border-rose-400 focus:border-rose-500'}`}
                                    value={urlValue}
                                    onChange={(event) => {
                                      const nextUrl = event.target.value;
                                      setDetailsForm((previous) => ({
                                        ...previous,
                                        profileLinks: profileLinks.map((entry, entryIndex) =>
                                          entryIndex === index ? { ...entry, url: nextUrl } : entry,
                                        ),
                                      }));
                                      setDetailsDirty(true);
                                    }}
                                    placeholder="https://instagram.com/..."
                                  />
                                  {!urlValid ? (
                                    <p className="text-[11px] font-medium normal-case tracking-normal text-rose-600">
                                      Use a valid http/https URL.
                                    </p>
                                  ) : null}
                                </label>

                                <div className="flex justify-end sm:pt-6">
                                  <button
                                    type="button"
                                    className={ghostButtonStyles}
                                    onClick={() => {
                                      setDetailsForm((previous) => ({
                                        ...previous,
                                        profileLinks: profileLinks.filter((_, entryIndex) => entryIndex !== index),
                                      }));
                                      setDetailsDirty(true);
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {profileLinks.length}/12 links saved.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Share link</p>
                    {selectedShareLink ? (
                      <div className="mt-2 space-y-3">
                        <input
                          className={inputStyles}
                          readOnly
                          value={selectedShareLink}
                          onFocus={(event) => event.currentTarget.select()}
                        />
                        <button
                          type="button"
                          className={ghostButtonStyles}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(selectedShareLink);
                              toast.success('Share link copied');
                            } catch {
                              toast.error('Unable to copy share link');
                            }
                          }}
                        >
                          Copy share link
                        </button>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Sharing is disabled. Turn it on to generate a private share link.
                      </p>
                    )}
                  </div>
                </div>
              </form>
            ) : (
              <GalleryEmptyState
                title="Select an album"
                description="Choose an album from the picker to rename it or update its metadata."
              />
            )}
          </GalleryPanelCard>
        </div>
      </div>
    </div>
  );
}

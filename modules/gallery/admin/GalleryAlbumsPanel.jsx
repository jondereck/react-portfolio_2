'use client';

import { useEffect, useMemo, useState } from 'react';
import { Info, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import { GalleryEmptyState, GalleryPanelCard, buttonStyles, ghostButtonStyles, inputStyles } from './galleryAdminShared';
import {
  GalleryAlbumInspectorPanel,
  GalleryAlbumSwitchSheet,
  GalleryAlbumsSidebar,
  GalleryCmsHeader,
  GalleryCmsModal,
  GalleryCmsShell,
  GalleryMobileTabs,
} from './cms';

const mobileTabs = [
  { id: 'manage', label: 'Manage', icon: Save },
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'details', label: 'Details', icon: Info },
];

export default function GalleryAlbumsPanel({ controller, embedded = false }) {
  const [activeTab, setActiveTab] = useState('manage');
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [albumSwitchOpen, setAlbumSwitchOpen] = useState(false);
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

  const albumCountLabel = useMemo(() => {
    if (!selectedAlbum) return '';
    const count =
      typeof selectedAlbum?._count?.photos === 'number'
        ? selectedAlbum._count.photos
        : Array.isArray(photos)
          ? photos.length
          : null;
    return typeof count === 'number' ? `${count} items` : '';
  }, [photos, selectedAlbum]);

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
    <>
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
      >
        {selectedAlbum ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Selected album
            </p>
            <p className="mt-2 truncate text-sm font-medium text-slate-900 dark:text-slate-50">{selectedAlbum.name}</p>
            {albumCountLabel ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{albumCountLabel}</p> : null}
          </div>
        ) : null}
      </ConfirmModal>

      <GalleryAlbumSwitchSheet
        open={albumSwitchOpen}
        onClose={() => setAlbumSwitchOpen(false)}
        albums={albums}
        selectedAlbumId={selectedAlbumId}
        onCreateNew={() => {
          setAlbumSwitchOpen(false);
          setCreateAlbumOpen(true);
          setActiveTab('create');
        }}
        onConfirm={(albumId) => {
          setSelectedAlbumId(albumId);
          setAlbumSwitchOpen(false);
          setActiveTab('manage');
        }}
      />

      <GalleryCmsModal
        open={createAlbumOpen}
        onOpenChange={setCreateAlbumOpen}
        title="Create album"
        description="Create a new album without leaving the Gallery CMS shell."
      >
        <form id="gallery-albums-create-form" className="space-y-3" onSubmit={createAlbum}>
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
      </GalleryCmsModal>

      <GalleryCmsShell
        embedded={embedded}
        header={
          <GalleryCmsHeader
            albumName={selectedAlbum?.name || 'Albums'}
            albumCountLabel={albumCountLabel}
            showSearch={false}
            showUploadButton={false}
            desktopActions={
              <>
                <button
                  type="button"
                  onClick={() => setCreateAlbumOpen(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  New album
                </button>
                <button
                  type="submit"
                  form="gallery-albums-manage-form"
                  disabled={!selectedAlbum || !detailsDirty || savingDetails}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                >
                  <Save className="h-4 w-4" />
                  {savingDetails ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={!selectedAlbum}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-500 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            }
            mobileActions={
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-3 text-sm font-medium text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
              >
                <Plus className="h-4 w-4" />
                New
              </button>
            }
          />
        }
        sidebar={
          <GalleryAlbumsSidebar
            albums={albums}
            selectedAlbumId={selectedAlbumId}
            loadingAlbums={loadingAlbums}
            onSelectAlbum={(albumId) => {
              setSelectedAlbumId(albumId);
              setActiveTab('manage');
            }}
            onCreateAlbumClick={() => setCreateAlbumOpen(true)}
            mobileAlbumName={selectedAlbum?.name}
            mobileAlbumCountLabel={albumCountLabel}
            onMobileOpenFilter={undefined}
            onMobileOpenImport={undefined}
            onMobileFocusSearch={undefined}
            onMobileOpenSwitch={() => setAlbumSwitchOpen(true)}
            showMobileChips={false}
          />
        }
        mobileTabs={<GalleryMobileTabs activeTab={activeTab} onChange={setActiveTab} tabs={mobileTabs} />}
        inspector={
          <GalleryAlbumInspectorPanel
            album={selectedAlbum}
            photosCount={Array.isArray(photos) ? photos.length : null}
            shareLink={selectedShareLink}
            siteOrigin={siteOrigin}
          />
        }
        main={
          <main className="min-w-0 bg-white dark:bg-slate-900">
            {activeTab === 'create' ? (
              <section className="space-y-4 px-4 py-4 sm:px-5 lg:hidden">
                <GalleryPanelCard title="Create album" description="Create a new album without exposing media intake or ordering tools.">
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
                        onChange={(event) =>
                          setAlbumForm((previous) => ({ ...previous, isPublished: event.target.checked }))
                        }
                      />
                      Publish immediately
                    </label>
                    <button className={`${buttonStyles} w-full`} disabled={savingAlbum}>
                      {savingAlbum ? 'Creating...' : 'Create Album'}
                    </button>
                  </form>
                </GalleryPanelCard>
              </section>
            ) : activeTab === 'details' ? (
              <section className="space-y-4 px-4 py-4 sm:px-5 lg:hidden">
                <GalleryPanelCard title="Album details" description="Quick overview of the selected album.">
                  {selectedAlbum ? (
                    <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Status</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {selectedAlbum.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Cover</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {selectedAlbum.coverPhotoId ? 'Assigned' : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500 dark:text-slate-400">Slug</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">{selectedAlbum.slug || '—'}</span>
                      </div>
                      {selectedShareLink ? (
                        <div className="space-y-2 pt-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Share link
                          </p>
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
                      ) : null}
                    </div>
                  ) : (
                    <GalleryEmptyState title="Select an album" description="Choose an album to see its summary." />
                  )}
                </GalleryPanelCard>
              </section>
            ) : (
              <section
                className={`space-y-6 px-4 py-4 sm:px-5 lg:block lg:px-6 lg:py-5 ${activeTab !== 'manage' ? 'hidden lg:block' : ''}`}
              >
                <GalleryPanelCard
                  title={selectedAlbum ? `Manage ${selectedAlbum.name}` : 'Current album'}
                  description="Update the selected album name, metadata, publish state, or delete it entirely."
                >
                  {selectedAlbum ? (
                    <form
                      id="gallery-albums-manage-form"
                      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"
                      onSubmit={saveAlbumDetails}
                    >
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
     
                          <button type="button" className={ghostButtonStyles} onClick={() => setConfirmDeleteOpen(true)}>
                            Delete Album
                          </button>
                          <button
                            type="button"
                            className={ghostButtonStyles}
                            onClick={() => {
                              setDetailsForm(selectedAlbum);
                              setDetailsDirty(false);
                            }}
                            disabled={!detailsDirty}
                          >
                            Reset changes
                          </button>
                        </div>
                      </div>

                      <div className="space-y-6">
           
                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Profile links
                          </p>
                          {profileLinks.length === 0 ? (
                            <button
                              type="button"
                              className={ghostButtonStyles}
                              onClick={() => {
                                setDetailsForm((previous) => ({
                                  ...previous,
                                  profileLinks: [{ platform: 'instagram', label: '', url: '' }],
                                }));
                                setDetailsDirty(true);
                              }}
                            >
                              Add first link
                            </button>
                          ) : (
                            <div className="mt-3 space-y-4">
                              {profileLinks.map((entry, index) => {
                                const urlValue = entry?.url ?? '';
                                const urlValid = !urlValue || isValidHttpUrl(urlValue);
                                return (
                                  <div
                                    key={`${entry.platform}-${index}`}
                                    className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40"
                                  >
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <label className="space-y-1">
                                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                          Platform
                                        </span>
                                        <select
                                          className={inputStyles}
                                          value={entry.platform}
                                          onChange={(event) => {
                                            const nextPlatform = event.target.value;
                                            setDetailsForm((previous) => ({
                                              ...previous,
                                              profileLinks: profileLinks.map((linkEntry, entryIndex) =>
                                                entryIndex === index ? { ...linkEntry, platform: nextPlatform } : linkEntry,
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

                                      <label className="space-y-1">
                                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                          URL
                                        </span>
                                        <input
                                          className={`${inputStyles} ${urlValid ? '' : 'border-rose-400 focus:border-rose-500'}`}
                                          value={urlValue}
                                          onChange={(event) => {
                                            const nextUrl = event.target.value;
                                            setDetailsForm((previous) => ({
                                              ...previous,
                                              profileLinks: profileLinks.map((entryItem, entryIndex) =>
                                                entryIndex === index ? { ...entryItem, url: nextUrl } : entryItem,
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
                                    </div>

                                    <div className="flex justify-end">
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
                                );
                              })}
                              <p className="text-xs text-slate-500 dark:text-slate-400">{profileLinks.length}/12 links saved.</p>
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
                    <GalleryEmptyState title="Select an album" description="Choose an album to rename it or update its metadata." />
                  )}
                </GalleryPanelCard>
              </section>
            )}
          </main>
        }
      />
    </>
  );
}

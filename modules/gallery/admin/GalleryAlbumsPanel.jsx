'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Info, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ConfirmModal';
import { fetchJson, GalleryEmptyState, GalleryPanelCard, buttonStyles, ghostButtonStyles, inputStyles } from './galleryAdminShared';
import {
  GalleryAlbumInspectorPanel,
  GalleryAlbumSwitchSheet,
  GalleryAlbumsSidebar,
  GalleryCmsModal,
  GalleryCmsShell,
  GalleryMobileTabs,
} from './cms';

const mobileTabs = [
  { id: 'manage', label: 'Manage', icon: Save },
  { id: 'create', label: 'Create', icon: Plus },
  { id: 'details', label: 'Details', icon: Info },
];

function ToggleSwitchField({ id, label, description, checked, onChange, disabled = false }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition dark:border-slate-800 dark:bg-slate-900 ${
        disabled ? 'opacity-60' : 'hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-50">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
        ) : null}
      </span>

      <span className="relative mt-0.5 inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="h-6 w-11 rounded-full bg-slate-200 shadow-inner transition peer-checked:bg-sky-600 dark:bg-slate-800 dark:peer-checked:bg-sky-500" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5 dark:bg-slate-950" />
      </span>
    </label>
  );
}

export default function GalleryAlbumsPanel({ controller, embedded = false }) {
  const sidebarCollapsedStorageKey = 'gallery:sidebarCollapsed:v1';
  const [activeTab, setActiveTab] = useState('manage');
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [albumSwitchOpen, setAlbumSwitchOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [siteOrigin, setSiteOrigin] = useState('');
  const [blurUnclothyGenerated, setBlurUnclothyGenerated] = useState(true);
  const [manualSidebarCollapsed, setManualSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(sidebarCollapsedStorageKey) === 'true';
  });

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(sidebarCollapsedStorageKey, manualSidebarCollapsed ? 'true' : 'false');
  }, [manualSidebarCollapsed, sidebarCollapsedStorageKey]);

  const loadGallerySettings = useCallback(async () => {
    try {
      const payload = await fetchJson('/api/gallery/settings', { method: 'GET' });
      setBlurUnclothyGenerated(payload?.blurUnclothyGenerated !== false);
    } catch {
      setBlurUnclothyGenerated(true);
    }
  }, []);

  useEffect(() => {
    void loadGallerySettings();
  }, [loadGallerySettings]);

  useEffect(() => {
    const onUpdated = () => {
      void loadGallerySettings();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('gallery:settings-updated', onUpdated);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('gallery:settings-updated', onUpdated);
      }
    };
  }, [loadGallerySettings]);

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
        sidebarCollapsed={manualSidebarCollapsed}
        header={
          <header className="border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 lg:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                  Album management
                </p>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-slate-50 sm:text-xl">
                    {selectedAlbum?.name || 'Select an album'}
                  </h1>
                  {albumCountLabel ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                      {albumCountLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Update album details, manage sharing, and publish settings.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-3.5 text-sm font-medium text-white shadow-sm dark:bg-slate-100 dark:text-slate-900 lg:hidden"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>

                <div className="hidden items-center gap-2 lg:flex">
                  <button
                    type="button"
                    onClick={() => setCreateAlbumOpen(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    New album
                  </button>
                  <button
                    type="submit"
                    form="gallery-albums-manage-form"
                    disabled={!selectedAlbum || !detailsDirty || savingDetails}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
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
                </div>
              </div>
            </div>
          </header>
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
            blurUnclothyGenerated={blurUnclothyGenerated}
            collapsed={manualSidebarCollapsed}
            onToggleCollapsed={() => setManualSidebarCollapsed((current) => !current)}
          />
        }
        mobileTabs={<GalleryMobileTabs activeTab={activeTab} onChange={setActiveTab} tabs={mobileTabs} />}
        inspector={
          selectedAlbum ? (
            <GalleryAlbumInspectorPanel
              album={selectedAlbum}
              photosCount={Array.isArray(photos) ? photos.length : null}
              shareLink={selectedShareLink}
              siteOrigin={siteOrigin}
              blurUnclothyGenerated={blurUnclothyGenerated}
            />
          ) : null
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
                className={`space-y-6 px-4 py-4 pb-24 sm:px-5 lg:block lg:px-6 lg:py-5 lg:pb-5 ${activeTab !== 'manage' ? 'hidden lg:block' : ''}`}
              >
                <GalleryPanelCard
                  title={selectedAlbum ? `Manage ${selectedAlbum.name}` : 'Current album'}
                  description="Update the selected album name, metadata, publish state, or delete it entirely."
                >
                  {selectedAlbum ? (
                    <form
                      id="gallery-albums-manage-form"
                      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"
                      onSubmit={saveAlbumDetails}
                    >
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                              Basic details
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Update the album title, slug, and description shown to visitors.
                            </p>
                          </div>

                          <div className="grid gap-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                  Album name
                                </span>
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
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                  Slug
                                </span>
                                <input
                                  className={inputStyles}
                                  value={detailsForm.slug}
                                  onChange={(event) => {
                                    setDetailsForm((previous) => ({ ...previous, slug: event.target.value }));
                                    setDetailsDirty(true);
                                  }}
                                  placeholder="album-slug"
                                />
                              </label>
                            </div>

                            <label className="space-y-1">
                              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                Description
                              </span>
                              <textarea
                                className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                                rows={4}
                                value={detailsForm.description}
                                onChange={(event) => {
                                  setDetailsForm((previous) => ({ ...previous, description: event.target.value }));
                                  setDetailsDirty(true);
                                }}
                                placeholder="Album description"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                              Publishing & sharing
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Control visibility and whether a private share link is available.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <ToggleSwitchField
                              id="gallery-albums-published"
                              label="Published"
                              description="Make this album visible to your audience."
                              checked={detailsForm.isPublished}
                              onChange={(event) => {
                                setDetailsForm((previous) => ({ ...previous, isPublished: event.target.checked }));
                                setDetailsDirty(true);
                              }}
                            />
                            <ToggleSwitchField
                              id="gallery-albums-share-link"
                              label="Enable share link"
                              description="Allow anyone with the link to view this album."
                              checked={detailsForm.shareLinkEnabled}
                              onChange={(event) => {
                                setDetailsForm((previous) => ({ ...previous, shareLinkEnabled: event.target.checked }));
                                setDetailsDirty(true);
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
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

                          <button
                            type="button"
                            className={`${ghostButtonStyles} lg:hidden`}
                            onClick={() => setConfirmDeleteOpen(true)}
                          >
                            Delete album
                          </button>
                        </div>
                      </div>

                      <div className="space-y-6">
           
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
                                    className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/30"
                                  >
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <label className="space-y-1">
                                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
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
                                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
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
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <button
                                  type="button"
                                  className={ghostButtonStyles}
                                  onClick={() => {
                                    setDetailsForm((previous) => {
                                      const currentLinks = Array.isArray(previous?.profileLinks) ? previous.profileLinks : [];
                                      if (currentLinks.length >= 12) {
                                        return previous;
                                      }

                                      return {
                                        ...previous,
                                        profileLinks: [...currentLinks, { platform: 'instagram', label: '', url: '' }],
                                      };
                                    });
                                    setDetailsDirty(true);
                                  }}
                                  disabled={profileLinks.length >= 12}
                                >
                                  Add link
                                </button>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{profileLinks.length}/12 links saved.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                            Share link tools
                          </p>
                          {selectedShareLink ? (
                            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                  Share link
                                </span>
                                <input
                                  className={inputStyles}
                                  readOnly
                                  value={selectedShareLink}
                                  onFocus={(event) => event.currentTarget.select()}
                                />
                              </label>
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

      {activeTab === 'manage' ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                {selectedAlbum ? selectedAlbum.name : 'Select an album'}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {savingDetails ? 'Saving...' : detailsDirty ? 'Unsaved changes' : 'No changes'}
              </p>
            </div>
            <button
              type="submit"
              form="gallery-albums-manage-form"
              disabled={!selectedAlbum || !detailsDirty || savingDetails}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
            >
              <Save className="h-4 w-4" />
              {savingDetails ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

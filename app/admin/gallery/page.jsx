'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AdminHeader from '@/components/AdminHeader';
import SortableMediaGrid from './components/SortableMediaGrid';
import {
  areIdListsEqual,
  formatLocalDate,
  getPhotoDedupeKey,
  getPhotoSortTime,
} from './utils';

const inputStyles =
  'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950';
const buttonStyles =
  'h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200';
const ghostButtonStyles =
  'h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';

const tabs = [
  { id: 'photos', label: 'Photos' },
  { id: 'arrange', label: 'Arrange' },
  { id: 'details', label: 'Details' },
  { id: 'import', label: 'Import' },
];

const fetchJson = async (url, init) => {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data;
};

const getSaveState = ({
  savingAlbum,
  savingPhoto,
  uploadingFiles,
  importingDrive,
  savingDetails,
  orderSaving,
  detailsDirty,
  orderDirty,
}) => {
  if (savingAlbum || savingPhoto || uploadingFiles || importingDrive || savingDetails || orderSaving) {
    return {
      label: 'Saving...',
      tone: 'text-amber-700 bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300',
    };
  }

  if (detailsDirty || orderDirty) {
    return {
      label: 'Unsaved changes',
      tone: 'text-orange-700 bg-orange-100 dark:bg-orange-950/30 dark:text-orange-300',
    };
  }

  return {
    label: 'All changes saved',
    tone: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300',
  };
};

function EmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminGalleryPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [photos, setPhotos] = useState([]);

  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const [activeTab, setActiveTab] = useState('photos');
  const [sortMode, setSortMode] = useState('custom');

  const [albumForm, setAlbumForm] = useState({ name: '', slug: '', description: '', isPublished: true });
  const [savingAlbum, setSavingAlbum] = useState(false);

  const [photoForm, setPhotoForm] = useState({ imageUrl: '', caption: '', dateTaken: '' });
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [detailsForm, setDetailsForm] = useState({ name: '', slug: '', description: '', isPublished: true });
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const [arrangePhotos, setArrangePhotos] = useState([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [selectionAnchorId, setSelectionAnchorId] = useState(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [dragSnapshotTaken, setDragSnapshotTaken] = useState(false);
  const [arrangeDragState, setArrangeDragState] = useState({ isDragging: false, draggingCount: 0 });

  const [driveForm, setDriveForm] = useState({ folderId: '', accessToken: '', limit: 50 });
  const [importingDrive, setImportingDrive] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState('keep');
  const [importSummary, setImportSummary] = useState(null);

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) ?? null,
    [albums, selectedAlbumId],
  );

  const saveState = useMemo(
    () =>
      getSaveState({
        savingAlbum,
        savingPhoto,
        uploadingFiles,
        importingDrive,
        savingDetails,
        orderSaving,
        detailsDirty,
        orderDirty,
      }),
    [
      detailsDirty,
      importingDrive,
      orderDirty,
      orderSaving,
      savingAlbum,
      savingDetails,
      savingPhoto,
      uploadingFiles,
    ],
  );

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        const response = await fetch('/api/admin/verify', { cache: 'no-store' });
        if (!response.ok) {
          router.replace('/');
          return;
        }

        if (mounted) {
          setReady(true);
        }
      } catch {
        router.replace('/');
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [router]);

  const loadAlbums = async () => {
    setLoadingAlbums(true);
    try {
      const data = await fetchJson('/api/gallery/albums');
      const nextAlbums = Array.isArray(data) ? data : [];
      setAlbums(nextAlbums);
      setSelectedAlbumId((previousId) => {
        if (previousId && nextAlbums.some((album) => album.id === previousId)) {
          return previousId;
        }
        return nextAlbums[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingAlbums(false);
    }
  };

  const loadPhotos = async (albumId, sort = sortMode) => {
    if (!albumId) {
      setPhotos([]);
      return;
    }

    setLoadingPhotos(true);
    try {
      const data = await fetchJson(`/api/gallery/albums/${albumId}/photos?sort=${sort}`);
      setPhotos(Array.isArray(data?.photos) ? data.photos : []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    if (ready) {
      loadAlbums();
    }
  }, [ready]);

  useEffect(() => {
    if (ready && selectedAlbumId) {
      loadPhotos(selectedAlbumId, sortMode);
    }
  }, [ready, selectedAlbumId, sortMode]);

  useEffect(() => {
    if (!selectedAlbum) {
      setDetailsForm({ name: '', slug: '', description: '', isPublished: true });
      setDetailsDirty(false);
      return;
    }

    setDetailsForm({
      name: selectedAlbum.name ?? '',
      slug: selectedAlbum.slug ?? '',
      description: selectedAlbum.description ?? '',
      isPublished: Boolean(selectedAlbum.isPublished),
    });
    setDetailsDirty(false);
  }, [selectedAlbum]);

  useEffect(() => {
    setArrangePhotos(photos);
    setSelectedPhotoIds([]);
    setSelectionAnchorId(null);
    setOrderDirty(false);
    setOrderHistory([]);
    setDragSnapshotTaken(false);
    setArrangeDragState({ isDragging: false, draggingCount: 0 });
  }, [photos]);

  useEffect(() => {
    if (activeTab !== 'arrange' && arrangeDragState.isDragging) {
      setArrangeDragState({ isDragging: false, draggingCount: 0 });
    }
  }, [activeTab, arrangeDragState.isDragging]);

  const markOrderDirtyFromItems = (items) => {
    const nextIds = items.map((item) => item.id);
    const baseIds = photos.map((item) => item.id);
    setOrderDirty(!areIdListsEqual(nextIds, baseIds));
  };

  const pushOrderHistory = (snapshot) => {
    setOrderHistory((previous) => [snapshot, ...previous].slice(0, 30));
  };
  const handleCreateAlbum = async (event) => {
    event.preventDefault();
    setSavingAlbum(true);

    try {
      const created = await fetchJson('/api/gallery/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(albumForm),
      });

      toast.success('Album created');
      setAlbumForm({ name: '', slug: '', description: '', isPublished: true });
      await loadAlbums();
      setSelectedAlbumId(created.id);
      setActiveTab('photos');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!selectedAlbumId) return;

    const confirmed = window.confirm('Delete this album and all photos? This cannot be undone.');
    if (!confirmed) return;

    try {
      await fetchJson(`/api/gallery/albums/${selectedAlbumId}`, { method: 'DELETE' });
      toast.success('Album deleted');
      setSelectedAlbumId(null);
      setPhotos([]);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSaveAlbumDetails = async (event) => {
    event.preventDefault();
    if (!selectedAlbumId) return;

    setSavingDetails(true);
    try {
      const updated = await fetchJson(`/api/gallery/albums/${selectedAlbumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detailsForm),
      });

      setAlbums((previous) =>
        previous.map((album) => (album.id === selectedAlbumId ? { ...album, ...updated } : album)),
      );
      setDetailsDirty(false);
      toast.success('Album details saved');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const handleAddPhoto = async (event) => {
    event.preventDefault();
    if (!selectedAlbumId) {
      toast.error('Select an album first.');
      return;
    }

    setSavingPhoto(true);
    try {
      await fetchJson(`/api/gallery/albums/${selectedAlbumId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: photoForm.imageUrl,
          caption: photoForm.caption || undefined,
          dateTaken: photoForm.dateTaken
            ? new Date(`${photoForm.dateTaken}T00:00:00.000Z`).toISOString()
            : undefined,
        }),
      });

      toast.success('Media added');
      setPhotoForm({ imageUrl: '', caption: '', dateTaken: '' });
      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleBulkUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!selectedAlbumId || files.length === 0) return;

    setUploadingFiles(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('imageFile', file);
        formData.append('caption', file.name);

        await fetchJson(`/api/gallery/albums/${selectedAlbumId}/photos`, {
          method: 'POST',
          body: formData,
        });
      }

      toast.success(`${files.length} file(s) uploaded`);
      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    } finally {
      event.target.value = '';
      setUploadingFiles(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!selectedAlbumId) return;

    try {
      await fetchJson(`/api/gallery/albums/${selectedAlbumId}/photos/${photoId}`, { method: 'DELETE' });
      toast.success('Media removed');
      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSetCoverPhoto = async (photoId) => {
    if (!selectedAlbumId) return;

    try {
      const updated = await fetchJson(`/api/gallery/albums/${selectedAlbumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverPhotoId: photoId }),
      });

      setAlbums((previous) =>
        previous.map((album) => (album.id === selectedAlbumId ? { ...album, ...updated } : album)),
      );
      toast.success('Cover photo updated');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDriveImport = async (event) => {
    event.preventDefault();

    if (!selectedAlbumId) {
      toast.error('Select an album first.');
      return;
    }

    setImportingDrive(true);
    setImportSummary(null);

    try {
      const existingKeys = new Set(photos.map(getPhotoDedupeKey).filter(Boolean));

      const result = await fetchJson(`/api/gallery/albums/${selectedAlbumId}/import/google-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: driveForm.folderId,
          accessToken: driveForm.accessToken,
          limit: Number(driveForm.limit) || 50,
        }),
      });

      let duplicateRemoved = 0;
      if (duplicateMode === 'skip' && Array.isArray(result.photos) && result.photos.length > 0) {
        const seenKeys = new Set(existingKeys);

        for (const importedPhoto of result.photos) {
          const key = getPhotoDedupeKey(importedPhoto);
          if (!key) continue;

          if (seenKeys.has(key)) {
            await fetchJson(`/api/gallery/albums/${selectedAlbumId}/photos/${importedPhoto.id}`, {
              method: 'DELETE',
            });
            duplicateRemoved += 1;
          } else {
            seenKeys.add(key);
          }
        }
      }

      const importedCount = Number(result.importedCount) || 0;
      const keptCount = Math.max(importedCount - duplicateRemoved, 0);

      setImportSummary({ importedCount, duplicateRemoved, keptCount, mode: duplicateMode });
      toast.success(
        duplicateMode === 'skip'
          ? `Imported ${keptCount} items (${duplicateRemoved} duplicates skipped)`
          : `Imported ${importedCount} photos from Google Drive`,
      );

      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImportingDrive(false);
    }
  };

  const handleReorderChange = (nextItems) => {
    setArrangePhotos(nextItems);
    markOrderDirtyFromItems(nextItems);
  };

  const handleArrangeAction = (nextItems) => {
    if (areIdListsEqual(nextItems.map((item) => item.id), arrangePhotos.map((item) => item.id))) {
      return;
    }

    pushOrderHistory(arrangePhotos);
    setArrangePhotos(nextItems);
    markOrderDirtyFromItems(nextItems);
  };

  const handleTogglePhotoSelect = (photoId, options = {}) => {
    const shiftKey = Boolean(options.shiftKey);
    const orderedIds = arrangePhotos.map((photo) => photo.id);

    setSelectedPhotoIds((previous) => {
      if (shiftKey && selectionAnchorId && orderedIds.includes(selectionAnchorId) && orderedIds.includes(photoId)) {
        const start = orderedIds.indexOf(selectionAnchorId);
        const end = orderedIds.indexOf(photoId);
        const [minIndex, maxIndex] = start < end ? [start, end] : [end, start];
        const rangeIds = orderedIds.slice(minIndex, maxIndex + 1);
        return Array.from(new Set([...previous, ...rangeIds]));
      }

      if (previous.includes(photoId)) {
        return previous.filter((id) => id !== photoId);
      }
      return [...previous, photoId];
    });

    setSelectionAnchorId(photoId);
  };

  const handleMoveSelection = (direction) => {
    if (selectedPhotoIds.length === 0) {
      toast.error('Select at least one media item first.');
      return;
    }

    const selectedSet = new Set(selectedPhotoIds);
    const selected = arrangePhotos.filter((photo) => selectedSet.has(photo.id));
    const rest = arrangePhotos.filter((photo) => !selectedSet.has(photo.id));

    const next = direction === 'top' ? [...selected, ...rest] : [...rest, ...selected];
    handleArrangeAction(next);
  };

  const handleUndoOrder = () => {
    if (orderHistory.length === 0) {
      toast.error('Nothing to undo yet.');
      return;
    }

    const [last, ...rest] = orderHistory;
    setOrderHistory(rest);
    setArrangePhotos(last);
    markOrderDirtyFromItems(last);
  };

  const handleSaveOrder = async () => {
    if (!selectedAlbumId) return;
    if (!orderDirty) {
      toast.message('Order is already saved.');
      return;
    }

    setOrderSaving(true);
    try {
      await fetchJson(`/api/gallery/albums/${selectedAlbumId}/photos/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: arrangePhotos.map((photo) => photo.id) }),
      });

      toast.success('Order saved');
      setPhotos(arrangePhotos);
      setSortMode('custom');
      setOrderDirty(false);
      setOrderHistory([]);
    } catch (error) {
      toast.error(error.message);
      await loadPhotos(selectedAlbumId, 'custom');
    } finally {
      setOrderSaving(false);
    }
  };

  const handleDragStateChange = (dragState) => {
    const isDragging = Boolean(dragState?.isDragging);
    const draggingCount = Number(dragState?.draggingCount) || 0;

    setArrangeDragState({ isDragging, draggingCount });

    if (isDragging && !dragSnapshotTaken) {
      pushOrderHistory(arrangePhotos);
      setDragSnapshotTaken(true);
    }

    if (!isDragging) {
      setDragSnapshotTaken(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    router.push('/');
  };

  if (!ready) return null;

  const isArrangeDragActive = activeTab === 'arrange' && arrangeDragState.isDragging;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-[1520px] space-y-6">
        <AdminHeader onLogout={handleLogout} />

        <div className="grid gap-6 lg:h-[calc(100vh-132px)] lg:grid-cols-[320px_1fr] lg:overflow-hidden">
          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:h-full lg:overflow-y-auto dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-lg font-semibold">Albums</h2>
              <p className="text-sm text-slate-500">Create albums separately from media operations.</p>
            </div>

            <form
              className="space-y-3 rounded-xl border border-slate-200 p-3 lg:sticky lg:top-0 lg:z-10 lg:bg-white lg:shadow-sm dark:border-slate-800 lg:dark:bg-slate-900"
              onSubmit={handleCreateAlbum}
            >
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
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                rows={3}
                placeholder="Description"
                value={albumForm.description}
                onChange={(event) => setAlbumForm((previous) => ({ ...previous, description: event.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={albumForm.isPublished}
                  onChange={(event) => setAlbumForm((previous) => ({ ...previous, isPublished: event.target.checked }))}
                />
                Published
              </label>
              <button className={`${buttonStyles} w-full`} disabled={savingAlbum}>
                {savingAlbum ? 'Creating...' : 'Create Album'}
              </button>
            </form>

            <div className="space-y-2">
              {loadingAlbums ? <p className="text-sm text-slate-500">Loading albums...</p> : null}
              {!loadingAlbums && albums.length === 0 ? (
                <EmptyState title="No albums yet" description="Create your first album to start managing media." />
              ) : null}
              {albums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    selectedAlbumId === album.id
                      ? 'border-slate-900 bg-slate-100 dark:border-slate-100 dark:bg-slate-800'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedAlbumId(album.id)}
                >
                  <p className="truncate text-sm font-semibold">{album.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{album._count?.photos ?? 0} photos</p>
                </button>
              ))}
            </div>
          </aside>

          <main className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:h-full lg:overflow-y-auto dark:border-slate-800 dark:bg-slate-900">
            {!selectedAlbum ? (
              <EmptyState
                title="Select an album"
                description="Choose an album from the sidebar to manage media, order, details, and imports."
              />
            ) : (
              <>
                <div
                  className={`transition-all duration-200 ${
                    isArrangeDragActive
                      ? 'pointer-events-none max-h-0 -translate-y-2 overflow-hidden opacity-0'
                      : 'max-h-48 translate-y-0 opacity-100'
                  }`}
                >
                  <header
                    className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
                    aria-hidden={isArrangeDragActive}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">{selectedAlbum.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">{selectedAlbum._count?.photos ?? photos.length} media item(s)</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-800">
                          {selectedAlbum.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${saveState.tone}`}>
                          {saveState.label}
                        </span>
                        <select
                          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                          value={sortMode}
                          onChange={(event) => setSortMode(event.target.value)}
                        >
                          <option value="custom">Sort: Manual</option>
                          <option value="dateDesc">Sort: Newest</option>
                          <option value="dateAsc">Sort: Oldest</option>
                        </select>
                        <button
                          type="button"
                          className="h-9 rounded-md border border-red-300 px-3 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                          onClick={handleDeleteAlbum}
                        >
                          Delete Album
                        </button>
                      </div>
                    </div>
                  </header>
                </div>

                <div
                  className={`transition-all duration-200 ${
                    isArrangeDragActive
                      ? 'pointer-events-none max-h-0 -translate-y-2 overflow-hidden opacity-0'
                      : 'max-h-24 translate-y-0 opacity-100'
                  }`}
                >
                  <div className="rounded-xl border border-slate-200 p-1 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                            activeTab === tab.id
                              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                          }`}
                          onClick={() => {
                            if (tab.id === 'arrange' && sortMode !== 'custom') {
                              setSortMode('custom');
                            }
                            setActiveTab(tab.id);
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {activeTab === 'photos' ? (
                  <section className="space-y-5">
                    <div className="grid gap-4 xl:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <p className="text-sm font-semibold">Upload files</p>
                        <p className="mt-1 text-xs text-slate-500">Batch upload images and videos.</p>
                        <input
                          className="mt-3 w-full text-sm"
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          disabled={uploadingFiles}
                          onChange={handleBulkUpload}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {uploadingFiles ? 'Uploading files...' : 'Cloudinary-backed upload with existing API flow.'}
                        </p>
                      </div>

                      <form className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" onSubmit={handleAddPhoto}>
                        <p className="text-sm font-semibold">Add media URL</p>
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

                      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <p className="text-sm font-semibold">Import Drive folder</p>
                        <p className="mt-1 text-xs text-slate-500">Use the dedicated import workflow with duplicate handling.</p>
                        <button
                          type="button"
                          className="mt-4 h-10 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                          onClick={() => setActiveTab('import')}
                        >
                          Open Import Tab
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500">
                      Photos tab is for add/import only. Manage order and existing media in Arrange or Details.
                    </p>
                  </section>
                ) : null}

                {activeTab === 'arrange' ? (
                  <section className="space-y-4">
                    {isArrangeDragActive ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/95 px-3 py-2 text-xs font-medium text-blue-700 backdrop-blur dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200">
                        Dragging {arrangeDragState.draggingCount > 1 ? `${arrangeDragState.draggingCount} selected items` : '1 item'}.
                        Release to drop.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                        <p className="text-sm font-medium">Shift-click supports range selection.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={ghostButtonStyles}
                            onClick={async () => {
                              if (sortMode !== 'custom') {
                                setSortMode('custom');
                                await loadPhotos(selectedAlbumId, 'custom');
                              }
                              handleArrangeAction(photos);
                            }}
                          >
                            Manual order
                          </button>
                          <button
                            type="button"
                            className={ghostButtonStyles}
                            onClick={() => handleArrangeAction([...arrangePhotos].sort((a, b) => getPhotoSortTime(b) - getPhotoSortTime(a)))}
                          >
                            Sort by newest
                          </button>
                          <button
                            type="button"
                            className={ghostButtonStyles}
                            onClick={() => handleArrangeAction([...arrangePhotos].sort((a, b) => getPhotoSortTime(a) - getPhotoSortTime(b)))}
                          >
                            Sort by oldest
                          </button>
                          <button
                            type="button"
                            className={ghostButtonStyles}
                            onClick={() => handleArrangeAction([...arrangePhotos].reverse())}
                          >
                            Reverse order
                          </button>
                          <button type="button" className={ghostButtonStyles} onClick={() => handleMoveSelection('top')}>
                            Move to top
                          </button>
                          <button type="button" className={ghostButtonStyles} onClick={() => handleMoveSelection('bottom')}>
                            Move to bottom
                          </button>
                          <button type="button" className={ghostButtonStyles} onClick={handleUndoOrder}>
                            Undo
                          </button>
                          <button type="button" className={buttonStyles} disabled={!orderDirty || orderSaving} onClick={handleSaveOrder}>
                            {orderSaving ? 'Saving order...' : 'Save order'}
                          </button>
                        </div>
                      </div>
                    )}

                    {arrangePhotos.length === 0 ? (
                      <EmptyState
                        title="No media to arrange"
                        description="Add media in the Photos tab first, then return here for manual ordering."
                      />
                    ) : (
                      <SortableMediaGrid
                        items={arrangePhotos}
                        selectedIds={selectedPhotoIds}
                        coverPhotoId={selectedAlbum.coverPhotoId}
                        onItemsChange={handleReorderChange}
                        onToggleSelect={handleTogglePhotoSelect}
                        onDelete={handleDeletePhoto}
                        onSetCover={handleSetCoverPhoto}
                        onDragStateChange={handleDragStateChange}
                      />
                    )}
                  </section>
                ) : null}
                {activeTab === 'details' ? (
                  <section className="space-y-5">
                    <form
                      className="grid gap-4 rounded-xl border border-slate-200 p-4 lg:grid-cols-2 dark:border-slate-700"
                      onSubmit={handleSaveAlbumDetails}
                    >
                      <div className="space-y-3">
                        <h3 className="text-base font-semibold">Album metadata</h3>
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
                        <label className="flex items-center gap-2 text-sm">
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
                        <button className={buttonStyles} disabled={!detailsDirty || savingDetails}>
                          {savingDetails ? 'Saving...' : 'Save details'}
                        </button>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base font-semibold">Per-photo details</h3>
                        {photos.length === 0 ? (
                          <p className="text-sm text-slate-500">No media metadata available yet.</p>
                        ) : (
                          <div className="max-h-80 overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
                            {photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="flex items-center justify-between gap-4 border-b border-slate-200 px-3 py-2 text-xs last:border-b-0 dark:border-slate-700"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{photo.caption || `Photo #${photo.id}`}</p>
                                  <p className="text-slate-500">{photo.sourceType} | {formatLocalDate(photo.dateTaken || photo.uploadedAt)}</p>
                                </div>
                                <button
                                  type="button"
                                  className="rounded-md border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                                  onClick={() => handleSetCoverPhoto(photo.id)}
                                >
                                  {selectedAlbum.coverPhotoId === photo.id ? 'Cover' : 'Set Cover'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </form>
                  </section>
                ) : null}

                {activeTab === 'import' ? (
                  <section className="space-y-4">
                    <form
                      className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4 dark:border-slate-700"
                      onSubmit={handleDriveImport}
                    >
                      <input
                        className={inputStyles}
                        placeholder="Google Drive Folder ID"
                        value={driveForm.folderId}
                        onChange={(event) => setDriveForm((previous) => ({ ...previous, folderId: event.target.value }))}
                        required
                      />
                      <input
                        className={inputStyles}
                        placeholder="OAuth Access Token"
                        value={driveForm.accessToken}
                        onChange={(event) => setDriveForm((previous) => ({ ...previous, accessToken: event.target.value }))}
                        required
                      />
                      <input
                        className={inputStyles}
                        type="number"
                        min={1}
                        max={200}
                        value={driveForm.limit}
                        onChange={(event) => setDriveForm((previous) => ({ ...previous, limit: event.target.value }))}
                      />
                      <button className={buttonStyles} disabled={importingDrive}>
                        {importingDrive ? 'Importing...' : 'Import Drive Folder'}
                      </button>
                    </form>

                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <p className="text-sm font-semibold">Duplicate handling</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="duplicateMode"
                            checked={duplicateMode === 'keep'}
                            onChange={() => setDuplicateMode('keep')}
                          />
                          Keep all imported media
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="duplicateMode"
                            checked={duplicateMode === 'skip'}
                            onChange={() => setDuplicateMode('skip')}
                          />
                          Skip duplicates by source ID / URL
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Preview: importing up to {Number(driveForm.limit) || 50} items from folder {driveForm.folderId || '...'}.
                      </p>
                    </div>

                    {importSummary ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                        <p className="font-semibold">Last import summary</p>
                        <p className="mt-1">
                          Imported: {importSummary.importedCount} | Kept: {importSummary.keptCount} | Duplicates removed:{' '}
                          {importSummary.duplicateRemoved}
                        </p>
                      </div>
                    ) : null}
                  </section>
                ) : null}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

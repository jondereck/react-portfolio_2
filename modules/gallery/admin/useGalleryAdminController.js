'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  areIdListsEqual,
  getPhotoSortTime,
} from '@/app/admin/gallery/utils';
import { fetchJson } from './galleryAdminShared';
import {
  createEmptyUploadSummary,
  getUploadSummaryToast,
  uploadAlbumFiles,
} from './galleryUploadBatch';

const galleryAdminSelectedAlbumStorageKey = 'galleryAdminSelectedAlbumId';

const readStoredAlbumId = () => {
  if (typeof window === 'undefined') return null;

  const storedValue = window.localStorage.getItem(galleryAdminSelectedAlbumStorageKey);
  const parsedValue = Number.parseInt(storedValue ?? '', 10);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const persistSelectedAlbumId = (albumId) => {
  if (typeof window === 'undefined') return;

  if (albumId) {
    window.localStorage.setItem(galleryAdminSelectedAlbumStorageKey, String(albumId));
    return;
  }

  window.localStorage.removeItem(galleryAdminSelectedAlbumStorageKey);
};

export function useGalleryAdminController() {
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [photos, setPhotos] = useState([]);

  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const [sortMode, setSortMode] = useState('custom');

  const [albumForm, setAlbumForm] = useState({ name: '', slug: '', description: '', isPublished: true });
  const [savingAlbum, setSavingAlbum] = useState(false);

  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);

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
  const [importSummary, setImportSummary] = useState(null);

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) ?? null,
    [albums, selectedAlbumId],
  );

  const saveState = useMemo(() => {
    if (savingAlbum || uploadingFiles || importingDrive || savingDetails || orderSaving) {
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
  }, [detailsDirty, importingDrive, orderDirty, orderSaving, savingAlbum, savingDetails, uploadingFiles]);

  const loadAlbums = async () => {
    setLoadingAlbums(true);
    try {
      const data = await fetchJson('/api/gallery/albums');
      const nextAlbums = Array.isArray(data) ? data : [];
      setAlbums(nextAlbums);
      setSelectedAlbumId((previousId) => {
        const storedAlbumId = readStoredAlbumId();

        if (previousId && nextAlbums.some((album) => album.id === previousId)) {
          return previousId;
        }

        if (storedAlbumId && nextAlbums.some((album) => album.id === storedAlbumId)) {
          return storedAlbumId;
        }

        return nextAlbums[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingAlbums(false);
    }
  };

  const loadPhotos = async (albumId, nextSort = sortMode) => {
    if (!albumId) {
      setPhotos([]);
      return;
    }

    setLoadingPhotos(true);
    try {
      const data = await fetchJson(`/api/gallery/albums/${albumId}/photos?sort=${nextSort}`);
      setPhotos(Array.isArray(data?.photos) ? data.photos : []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  useEffect(() => {
    persistSelectedAlbumId(selectedAlbumId);
  }, [selectedAlbumId]);

  useEffect(() => {
    if (selectedAlbumId) {
      loadPhotos(selectedAlbumId, sortMode);
    }
  }, [selectedAlbumId, sortMode]);

  useEffect(() => {
    setUploadProgress(null);
    setUploadSummary(null);
  }, [selectedAlbumId]);

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

  const selectedAlbumMediaCount = selectedAlbum?._count?.photos ?? photos.length;

  const markOrderDirtyFromItems = (items) => {
    const nextIds = items.map((item) => item.id);
    const baseIds = photos.map((item) => item.id);
    setOrderDirty(!areIdListsEqual(nextIds, baseIds));
  };

  const pushOrderHistory = (snapshot) => {
    setOrderHistory((previous) => [snapshot, ...previous].slice(0, 30));
  };

  const createAlbum = async (event) => {
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
      selectAlbum(created.id);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingAlbum(false);
    }
  };

  const deleteAlbum = async (albumId = selectedAlbumId, options = {}) => {
    if (!albumId) return;
    const { skipConfirm = false } = options;

    if (!skipConfirm) {
      const confirmed = window.confirm('Delete this album and all photos? This cannot be undone.');
      if (!confirmed) return;
    }

    try {
      await fetchJson(`/api/gallery/albums/${albumId}`, { method: 'DELETE' });
      toast.success('Album deleted');
      if (albumId === selectedAlbumId) {
        selectAlbum(null);
        setPhotos([]);
      }
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const saveAlbumDetails = async (event) => {
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

  const uploadFiles = async (files) => {
    const nextFiles = Array.from(files || []);
    if (!selectedAlbumId || nextFiles.length === 0) return;

    setUploadingFiles(true);
    setUploadSummary(createEmptyUploadSummary());

    try {
      const summary = await uploadAlbumFiles({
        albumId: selectedAlbumId,
        files: nextFiles,
        onProgressChange: setUploadProgress,
      });

      setUploadSummary(summary);

      const summaryMessage = getUploadSummaryToast(summary);
      if (summary.failedCount > 0 && summary.uploadedCount === 0) {
        toast.error(summaryMessage);
      } else if (summary.failedCount > 0 || summary.skippedCount > 0) {
        toast.message(summaryMessage);
      } else {
        toast.success(summaryMessage);
      }

        if (summary.uploadedCount > 0) {
          await Promise.all([loadPhotos(selectedAlbumId, sortMode), loadAlbums()]);
        } else {
          await loadAlbums();
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setUploadingFiles(false);
      }
  };

  const bulkUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    await uploadFiles(files);
    event.target.value = '';
  };

  const deletePhoto = async (photoId) => {
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

  const deleteSelectedPhotos = async (options = {}) => {
    const photoIds = [...selectedPhotoIds];
    if (!selectedAlbumId || photoIds.length === 0) return;
    const { skipConfirm = false } = options;

    if (!skipConfirm) {
      const confirmed = window.confirm(
        `Delete ${photoIds.length} selected media item${photoIds.length === 1 ? '' : 's'}? This cannot be undone.`,
      );
      if (!confirmed) return;
    }

    try {
      for (const photoId of photoIds) {
        await fetchJson(`/api/gallery/albums/${selectedAlbumId}/photos/${photoId}`, { method: 'DELETE' });
      }

      clearPhotoSelection();
      toast.success(`${photoIds.length} media item${photoIds.length === 1 ? '' : 's'} deleted`);
      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const setCoverPhoto = async (photoId) => {
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
      const result = await fetchJson(`/api/gallery/albums/${selectedAlbumId}/import/google-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: driveForm.folderId,
          accessToken: driveForm.accessToken,
          limit: Number(driveForm.limit) || 50,
        }),
      });

      const importedCount = Number(result.importedCount) || 0;
      const skippedCount = Number(result.skippedCount) || 0;

      setImportSummary({
        importedCount,
        skippedCount,
        skipped: Array.isArray(result.skipped) ? result.skipped : [],
      });
      toast.success(
        skippedCount > 0
          ? `Imported ${importedCount} item(s) and skipped ${skippedCount} duplicate(s)`
          : `Imported ${importedCount} photo(s) from Google Drive`,
      );

      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImportingDrive(false);
    }
  };

  const reorderChange = (nextItems) => {
    setArrangePhotos(nextItems);
    markOrderDirtyFromItems(nextItems);
  };

  const arrangeAction = (nextItems) => {
    if (areIdListsEqual(nextItems.map((item) => item.id), arrangePhotos.map((item) => item.id))) {
      return;
    }

    pushOrderHistory(arrangePhotos);
    setArrangePhotos(nextItems);
    markOrderDirtyFromItems(nextItems);
  };

  const togglePhotoSelect = (photoId, options = {}) => {
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

  const clearPhotoSelection = () => {
    setSelectedPhotoIds([]);
    setSelectionAnchorId(null);
  };

  const moveSelection = (direction) => {
    if (selectedPhotoIds.length === 0) {
      toast.error('Select at least one media item first.');
      return;
    }

    const selectedSet = new Set(selectedPhotoIds);
    const selected = arrangePhotos.filter((photo) => selectedSet.has(photo.id));
    const rest = arrangePhotos.filter((photo) => !selectedSet.has(photo.id));

    const next = direction === 'top' ? [...selected, ...rest] : [...rest, ...selected];
    arrangeAction(next);
  };

  const undoOrder = () => {
    if (orderHistory.length === 0) {
      toast.error('Nothing to undo yet.');
      return;
    }

    const [last, ...rest] = orderHistory;
    setOrderHistory(rest);
    setArrangePhotos(last);
    markOrderDirtyFromItems(last);
  };

  const saveOrder = async () => {
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

  const selectAlbum = (albumId) => {
    persistSelectedAlbumId(albumId);
    setSelectedAlbumId(albumId);
  };

  const activeAlbumMediaLabel = selectedAlbum
    ? `${selectedAlbumMediaCount} media item${selectedAlbumMediaCount === 1 ? '' : 's'}`
    : 'No album selected';

  return {
    albums,
    selectedAlbumId,
    selectedAlbum,
    photos,
    loadingAlbums,
    loadingPhotos,
    sortMode,
    setSortMode,
    albumForm,
    setAlbumForm,
    savingAlbum,
    uploadingFiles,
    uploadProgress,
    uploadSummary,
    detailsForm,
    setDetailsForm,
    detailsDirty,
    setDetailsDirty,
    savingDetails,
    arrangePhotos,
    selectedPhotoIds,
    setSelectedPhotoIds,
    orderDirty,
    orderSaving,
    arrangeDragState,
    driveForm,
    setDriveForm,
    importingDrive,
    importSummary,
    saveState,
    selectedAlbumMediaCount,
    activeAlbumMediaLabel,
    setSelectedAlbumId: selectAlbum,
    loadAlbums,
    loadPhotos,
    createAlbum,
    deleteAlbum,
    saveAlbumDetails,
    uploadFiles,
    bulkUpload,
    deletePhoto,
    deleteSelectedPhotos,
    setCoverPhoto,
    handleDriveImport,
    reorderChange,
    arrangeAction,
    togglePhotoSelect,
    clearPhotoSelection,
    moveSelection,
    undoOrder,
    saveOrder,
    handleDragStateChange,
    getPhotoSortTime,
  };
}

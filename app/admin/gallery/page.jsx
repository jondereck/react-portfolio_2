'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AdminHeader from '@/components/AdminHeader';

const inputStyles = 'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
const buttonStyles = 'h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900';

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

const formatLocalDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

export default function AdminGalleryPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [sortMode, setSortMode] = useState('custom');

  const [albumForm, setAlbumForm] = useState({ name: '', slug: '', description: '', isPublished: true });
  const [savingAlbum, setSavingAlbum] = useState(false);

  const [photoForm, setPhotoForm] = useState({ imageUrl: '', caption: '', dateTaken: '' });
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [driveForm, setDriveForm] = useState({ folderId: '', accessToken: '', limit: 50 });
  const [importingDrive, setImportingDrive] = useState(false);

  const selectedAlbum = useMemo(() => albums.find((item) => item.id === selectedAlbumId) ?? null, [albums, selectedAlbumId]);

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
      setAlbums(Array.isArray(data) ? data : []);
      if (!selectedAlbumId && data.length > 0) {
        setSelectedAlbumId(data[0].id);
      }
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
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingAlbum(false);
    }
  };

  const handleDeleteAlbum = async () => {
    if (!selectedAlbumId) return;
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
          dateTaken: photoForm.dateTaken ? new Date(`${photoForm.dateTaken}T00:00:00.000Z`).toISOString() : undefined,
        }),
      });
      toast.success('Photo added');
      setPhotoForm({ imageUrl: '', caption: '', dateTaken: '' });
      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!selectedAlbumId) return;
    try {
      await fetchJson(`/api/gallery/albums/${selectedAlbumId}/photos/${photoId}`, {
        method: 'DELETE',
      });
      toast.success('Photo removed');
      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSetCoverPhoto = async (photoId) => {
    if (!selectedAlbumId) return;
    try {
      await fetchJson(`/api/gallery/albums/${selectedAlbumId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverPhotoId: photoId }),
      });
      toast.success('Cover photo updated');
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
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

  const handleDriveImport = async (event) => {
    event.preventDefault();
    if (!selectedAlbumId) {
      toast.error('Select an album first.');
      return;
    }

    setImportingDrive(true);
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

      toast.success(`Imported ${result.importedCount} photos from Google Drive`);
      await loadPhotos(selectedAlbumId, sortMode);
      await loadAlbums();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setImportingDrive(false);
    }
  };

  const handleReorder = async (sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) return;

    const ordered = [...photos];
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    setPhotos(ordered);

    try {
      await fetchJson(`/api/gallery/albums/${selectedAlbumId}/photos/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: ordered.map((photo) => photo.id) }),
      });
      toast.success('Photo order saved');
    } catch (error) {
      toast.error(error.message);
      await loadPhotos(selectedAlbumId, 'custom');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    router.push('/');
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader onLogout={handleLogout} />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Albums</h2>
            <form className="mt-4 space-y-3" onSubmit={handleCreateAlbum}>
              <input className={inputStyles} placeholder="Album name" value={albumForm.name} onChange={(e) => setAlbumForm((prev) => ({ ...prev, name: e.target.value }))} required />
              <input className={inputStyles} placeholder="Slug (optional)" value={albumForm.slug} onChange={(e) => setAlbumForm((prev) => ({ ...prev, slug: e.target.value }))} />
              <textarea className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" rows={3} placeholder="Description" value={albumForm.description} onChange={(e) => setAlbumForm((prev) => ({ ...prev, description: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={albumForm.isPublished} onChange={(e) => setAlbumForm((prev) => ({ ...prev, isPublished: e.target.checked }))} /> Published
              </label>
              <button className={buttonStyles} disabled={savingAlbum}>{savingAlbum ? 'Saving...' : 'Create Album'}</button>
            </form>

            <div className="mt-5 space-y-2">
              {loadingAlbums ? <p className="text-sm text-slate-500">Loading albums...</p> : null}
              {albums.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedAlbumId === album.id ? 'border-slate-900 bg-slate-100 dark:border-slate-100 dark:bg-slate-800' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}
                  onClick={() => setSelectedAlbumId(album.id)}
                >
                  <p className="font-medium">{album.name}</p>
                  <p className="text-xs text-slate-500">{album._count?.photos ?? 0} photos</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selectedAlbum ? selectedAlbum.name : 'Select an album'}</h2>
                <p className="text-sm text-slate-500">Drag photos to save custom order. Date sort is available for review.</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>Sort:</span>
                <select className={inputStyles} value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                  <option value="custom">Custom</option>
                  <option value="dateAsc">Date ASC</option>
                  <option value="dateDesc">Date DESC</option>
                </select>
                <button type="button" className="h-10 rounded-md border border-red-300 px-3 text-xs text-red-700 hover:bg-red-50" onClick={handleDeleteAlbum}>
                  Delete Album
                </button>
              </div>
            </div>

            <form className="grid gap-3 md:grid-cols-3" onSubmit={handleAddPhoto}>
              <input className={inputStyles} placeholder="Image URL" value={photoForm.imageUrl} onChange={(e) => setPhotoForm((prev) => ({ ...prev, imageUrl: e.target.value }))} required />
              <input className={inputStyles} placeholder="Caption" value={photoForm.caption} onChange={(e) => setPhotoForm((prev) => ({ ...prev, caption: e.target.value }))} />
              <div className="flex gap-2">
                <input className={inputStyles} type="date" value={photoForm.dateTaken} onChange={(e) => setPhotoForm((prev) => ({ ...prev, dateTaken: e.target.value }))} />
                <button className={buttonStyles} disabled={savingPhoto}>{savingPhoto ? 'Adding...' : 'Add Photo'}</button>
              </div>
            </form>

            <div className="rounded-md border border-slate-200 p-3 dark:border-slate-700">
              <label className="block text-sm font-medium">Bulk Upload Files</label>
              <input className="mt-2 w-full text-sm" type="file" accept="image/*" multiple onChange={handleBulkUpload} disabled={uploadingFiles} />
              <p className="mt-1 text-xs text-slate-500">{uploadingFiles ? 'Uploading...' : 'Select multiple images to upload via Cloudinary-backed API.'}</p>
            </div>

            <form className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-4 dark:border-slate-700" onSubmit={handleDriveImport}>
              <input className={inputStyles} placeholder="Google Drive Folder ID" value={driveForm.folderId} onChange={(e) => setDriveForm((prev) => ({ ...prev, folderId: e.target.value }))} required />
              <input className={inputStyles} placeholder="OAuth Access Token" value={driveForm.accessToken} onChange={(e) => setDriveForm((prev) => ({ ...prev, accessToken: e.target.value }))} required />
              <input className={inputStyles} type="number" min={1} max={200} placeholder="Limit" value={driveForm.limit} onChange={(e) => setDriveForm((prev) => ({ ...prev, limit: e.target.value }))} />
              <button className={buttonStyles} disabled={importingDrive}>{importingDrive ? 'Importing...' : 'Import Drive Folder'}</button>
            </form>

            {loadingPhotos ? <p className="text-sm text-slate-500">Loading photos...</p> : null}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <article
                  key={photo.id}
                  draggable={sortMode === 'custom'}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/photo-index', String(index));
                  }}
                  onDragOver={(event) => {
                    if (sortMode === 'custom') {
                      event.preventDefault();
                    }
                  }}
                  onDrop={(event) => {
                    if (sortMode !== 'custom') return;
                    const sourceIndex = Number(event.dataTransfer.getData('text/photo-index'));
                    handleReorder(sourceIndex, index);
                  }}
                  className={`overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${sortMode === 'custom' ? 'cursor-move' : ''}`}
                >
                  <div className="aspect-video bg-slate-100 dark:bg-slate-800">
                    <img src={photo.imageUrl} alt={photo.caption || `Photo ${photo.id}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-2 p-3 text-sm">
                    <p className="font-medium">{photo.caption || 'Untitled'}</p>
                    <p className="text-xs text-slate-500">Taken: {formatLocalDate(photo.dateTaken || photo.uploadedAt)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase text-slate-500">{photo.sourceType}</span>
                      <div className="flex items-center gap-3">
                        <button type="button" className="text-xs text-blue-700" onClick={() => handleSetCoverPhoto(photo.id)}>
                          Set Cover
                        </button>
                        <button type="button" className="text-xs text-red-600" onClick={() => handleDeletePhoto(photo.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

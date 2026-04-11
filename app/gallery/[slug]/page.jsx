'use client';

import { useEffect, useState } from 'react';

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

export default function AlbumDetailPage({ params }) {
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [sort, setSort] = useState('custom');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const albumData = await fetchJson(`/api/gallery/albums/by-slug/${params.slug}`);
        setAlbum(albumData);

        const photoData = await fetchJson(`/api/gallery/albums/${albumData.id}/photos?sort=${sort}`);
        setPhotos(Array.isArray(photoData.photos) ? photoData.photos : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [params.slug, sort]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <a href="/gallery" className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50">Back to albums</a>

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{album?.name || 'Album'}</h1>
            {album?.description ? <p className="text-sm text-slate-500">{album.description}</p> : null}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Sort:</span>
            <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="custom">Custom</option>
              <option value="dateAsc">Date ASC</option>
              <option value="dateDesc">Date DESC</option>
            </select>
          </div>
        </header>

        {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <article key={photo.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="aspect-video bg-slate-100 dark:bg-slate-800">
                <img src={photo.imageUrl} alt={photo.caption || `Photo ${photo.id}`} className="h-full w-full object-cover" />
              </div>
              <div className="space-y-1 p-3 text-sm">
                <p className="font-medium text-slate-900 dark:text-slate-50">{photo.caption || 'Untitled photo'}</p>
                <p className="text-xs text-slate-500">Date: {formatDate(photo.dateTaken || photo.uploadedAt)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

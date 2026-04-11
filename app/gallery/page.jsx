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

export default function GalleryPage() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchJson('/api/gallery/albums');
        setAlbums(Array.isArray(data) ? data.filter((item) => item.isPublished) : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Gallery</h1>
          <p className="text-sm text-slate-500">Browse published albums.</p>
        </header>

        {loading ? <p className="text-sm text-slate-500">Loading...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <a key={album.id} href={`/gallery/${album.slug}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="aspect-video bg-slate-100 dark:bg-slate-800">
                {album.coverPhoto?.imageUrl ? (
                  <img src={album.coverPhoto.imageUrl} alt={album.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-1 p-4">
                <h2 className="font-semibold text-slate-900 dark:text-slate-50">{album.name}</h2>
                <p className="text-sm text-slate-500">{album._count?.photos ?? 0} photos</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

import Link from 'next/link';

export const inputStyles =
  'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950';
export const buttonStyles =
  'h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200';
export const ghostButtonStyles =
  'h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';

export const galleryPageMeta = {
  albums: {
    eyebrow: 'Album Management',
    title: 'Albums',
    description: 'Create, select, publish, and remove albums without the media intake or ordering tools crowding the screen.',
  },
  media: {
    eyebrow: 'Media Intake',
    title: 'Media',
    description: 'Upload files and add remote media to the selected album with only intake tools visible.',
  },
  arrange: {
    eyebrow: 'Sorting Workspace',
    title: 'Arrange',
    description: 'Reorder the selected album with a dedicated drag-and-drop workspace and no intake clutter.',
  },
  import: {
    eyebrow: 'Import Workflow',
    title: 'Import',
    description: 'Pull media from Google Drive with duplicate handling and import summaries in one focused page.',
  },
  settings: {
    eyebrow: 'Gallery Settings',
    title: 'Settings',
    description: 'Edit album metadata, publish state, and cover-photo assignment without other gallery tooling.',
  },
  workspace: {
    eyebrow: 'Advanced Workspace',
    title: 'Workspace',
    description: 'Use the all-in-one gallery workspace when you need every tool in one place.',
  },
};

export async function fetchJson(url, init) {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data;
}

export function GalleryPageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{eyebrow}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function GalleryEmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function GalleryAlbumPicker({
  albums,
  selectedAlbumId,
  loadingAlbums,
  onSelectAlbum,
  emptyTitle = 'No albums yet',
  emptyDescription = 'Create an album first to unlock this page.',
}) {
  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Albums</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Select the album that this workspace should operate on.</p>
      </div>

      {loadingAlbums ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading albums...</p> : null}

      {!loadingAlbums && albums.length === 0 ? (
        <GalleryEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-2">
          {albums.map((album) => {
            const isActive = selectedAlbumId === album.id;

            return (
              <button
                key={album.id}
                type="button"
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-100 dark:border-slate-100 dark:bg-slate-800'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
                onClick={() => onSelectAlbum(album.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{album.name}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{album._count?.photos ?? 0} media items</p>
                  </div>
                  <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {album.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}

export function GalleryPanelCard({ title, description, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
        {description ? <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function GalleryRouteLink({ href, children, className = '' }) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

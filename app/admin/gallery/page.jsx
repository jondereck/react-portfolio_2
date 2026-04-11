import {
  ArrowUpDown,
  CloudDownload,
  FolderOpen,
  Images,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import AdminOverviewCard from '@/components/admin/shared/AdminOverviewCard';
import AdminMetricCard from '@/components/admin/shared/AdminMetricCard';
import { buildGalleryRouteHref } from '@/modules/gallery/admin/workspaceConfig';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

const galleryOverviewCards = [
  {
    title: 'Manage Albums',
    description: 'Open the album management page to create, select, publish, and remove albums.',
    href: buildGalleryRouteHref('albums'),
    icon: FolderOpen,
    badge: 'Library',
    accent: 'emerald',
  },
  {
    title: 'Manage Media',
    description: 'Open the media intake page to upload files and add remote media URLs.',
    href: buildGalleryRouteHref('media'),
    icon: Images,
    badge: 'Intake',
    accent: 'sky',
  },
  {
    title: 'Arrange Media',
    description: 'Open the dedicated ordering workspace for drag-and-drop sequencing and save controls.',
    href: buildGalleryRouteHref('arrange'),
    icon: ArrowUpDown,
    badge: 'Order',
    accent: 'amber',
  },
  {
    title: 'Import Media',
    description: 'Open the import-only page for Google Drive folder imports and duplicate handling.',
    href: buildGalleryRouteHref('import'),
    icon: CloudDownload,
    badge: 'Import',
    accent: 'rose',
  },
  {
    title: 'Gallery Settings',
    description: 'Open the settings page for album metadata, publish state, and cover-photo assignment.',
    href: buildGalleryRouteHref('settings'),
    icon: Settings2,
    badge: 'Config',
    accent: 'slate',
  },
];

function formatAlbumHint(totalAlbums) {
  if (totalAlbums === 1) {
    return '1 album in this library';
  }

  return `${totalAlbums} albums in this library`;
}

export default async function GalleryAdminPage() {
  const albums = await galleryService.listAlbums(true);
  const totalAlbums = albums.length;
  const publishedAlbums = albums.filter((album) => album.isPublished).length;
  const totalMedia = albums.reduce((sum, album) => sum + (album._count?.photos ?? 0), 0);
  const draftAlbums = Math.max(totalAlbums - publishedAlbums, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Gallery Module Overview</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Each card now opens a dedicated route with only the relevant tools visible. The advanced all-in-one workspace remains
          available separately for power workflows, but it is no longer the default destination.
        </p>
        <Link href="/admin/gallery/workspace" className="mt-3 inline-flex text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-200">
          Open advanced workspace
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard
          label="Albums"
          value={totalAlbums}
          hint={formatAlbumHint(totalAlbums)}
        />
        <AdminMetricCard
          label="Published"
          value={publishedAlbums}
          hint={draftAlbums > 0 ? `${draftAlbums} still in draft` : 'All albums are publish-ready'}
        />
        <AdminMetricCard
          label="Media"
          value={totalMedia}
          hint="Total items indexed across the gallery module"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {galleryOverviewCards.map((card) => (
          <AdminOverviewCard key={card.title} {...card} />
        ))}
      </section>
    </div>
  );
}

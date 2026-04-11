'use client';

import GalleryAlbumsPanel from '@/modules/gallery/admin/GalleryAlbumsPanel';
import { useGalleryAdminController } from '@/modules/gallery/admin/useGalleryAdminController';

export default function GalleryAlbumsPage() {
  const controller = useGalleryAdminController();

  return <GalleryAlbumsPanel controller={controller} />;
}

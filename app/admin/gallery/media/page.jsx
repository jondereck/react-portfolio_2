'use client';

import GalleryMediaPanel from '@/modules/gallery/admin/GalleryMediaPanel';
import { useGalleryAdminController } from '@/modules/gallery/admin/useGalleryAdminController';

export default function GalleryMediaPage() {
  const controller = useGalleryAdminController();

  return <GalleryMediaPanel controller={controller} />;
}

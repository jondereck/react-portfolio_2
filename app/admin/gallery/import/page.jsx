'use client';

import GalleryImportPanel from '@/modules/gallery/admin/GalleryImportPanel';
import { useGalleryAdminController } from '@/modules/gallery/admin/useGalleryAdminController';

export default function GalleryImportPage() {
  const controller = useGalleryAdminController();

  return <GalleryImportPanel controller={controller} />;
}

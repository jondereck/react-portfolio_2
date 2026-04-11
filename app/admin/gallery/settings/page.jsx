'use client';

import GallerySettingsPanel from '@/modules/gallery/admin/GallerySettingsPanel';
import { useGalleryAdminController } from '@/modules/gallery/admin/useGalleryAdminController';

export default function GallerySettingsPage() {
  const controller = useGalleryAdminController();

  return <GallerySettingsPanel controller={controller} />;
}

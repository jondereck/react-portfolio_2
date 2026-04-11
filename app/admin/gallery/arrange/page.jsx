'use client';

import GalleryArrangePanel from '@/modules/gallery/admin/GalleryArrangePanel';
import { useGalleryAdminController } from '@/modules/gallery/admin/useGalleryAdminController';

export default function GalleryArrangePage() {
  const controller = useGalleryAdminController();

  return <GalleryArrangePanel controller={controller} />;
}

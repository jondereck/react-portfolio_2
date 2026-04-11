import GalleryAdminWorkspace from '@/modules/gallery/admin/GalleryAdminWorkspace';
import { normalizeGalleryWorkspaceTab } from '@/modules/gallery/admin/workspaceConfig';

export default async function GalleryWorkspacePage({ searchParams }) {
  const params = await searchParams;

  return <GalleryAdminWorkspace initialTab={normalizeGalleryWorkspaceTab(params?.tab)} />;
}

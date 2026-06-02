import { requirePageModuleAccess } from '@/lib/auth/session';

export default async function GalleryAdminLayout({ children }) {
  await requirePageModuleAccess('gallery');
  return children;
}

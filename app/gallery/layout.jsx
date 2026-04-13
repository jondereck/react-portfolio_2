import { requirePageRole } from '@/lib/auth/session';
import { ADMIN_ROLES } from '@/lib/auth/roles';

export default async function PrivateGalleryLayout({ children }) {
  await requirePageRole(ADMIN_ROLES, '/admin/login');
  return children;
}

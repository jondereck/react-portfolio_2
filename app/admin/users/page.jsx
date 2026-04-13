import { requirePageRole } from '@/lib/auth/session';
import { USER_MANAGEMENT_ROLES } from '@/lib/auth/roles';
import AdminUsersClient from '@/components/admin/users/AdminUsersClient';

export default async function AdminUsersPage() {
  await requirePageRole(USER_MANAGEMENT_ROLES);
  return <AdminUsersClient />;
}

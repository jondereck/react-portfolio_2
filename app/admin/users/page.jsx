import { requirePageModuleAccess } from '@/lib/auth/session';
import AdminUsersClient from '@/components/admin/users/AdminUsersClient';

export default async function AdminUsersPage() {
  await requirePageModuleAccess('users');
  return <AdminUsersClient />;
}

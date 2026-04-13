import AdminAccountClient from '@/components/admin/account/AdminAccountClient';
import { requirePageRole } from '@/lib/auth/session';
import { ADMIN_ROLES } from '@/lib/auth/roles';

export default async function AdminAccountPage() {
  await requirePageRole(ADMIN_ROLES);

  return <AdminAccountClient />;
}

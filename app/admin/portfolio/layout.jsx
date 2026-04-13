import { ADMIN_ROLES } from '@/lib/auth/roles';
import { requirePageRole } from '@/lib/auth/session';

export default async function PortfolioAdminLayout({ children }) {
  await requirePageRole(ADMIN_ROLES);
  return children;
}

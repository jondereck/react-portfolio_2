import { requirePageRole } from '@/lib/auth/session';

export default async function AdminSettingsLayout({ children }) {
  await requirePageRole(['super_admin']);
  return children;
}

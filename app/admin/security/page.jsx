import SecuritySettingsSection from '@/modules/system/admin/SecuritySettingsSection';
import { requirePageRole } from '@/lib/auth/session';
import { ADMIN_ROLES } from '@/lib/auth/roles';

export default async function AdminSecurityPage() {
  await requirePageRole(ADMIN_ROLES);

  return (
    <div className="space-y-6">
      <SecuritySettingsSection />
    </div>
  );
}


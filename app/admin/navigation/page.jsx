import NavigationSettingsSection from '@/modules/system/admin/NavigationSettingsSection';
import { requirePageRole } from '@/lib/auth/session';
import { ADMIN_ROLES } from '@/lib/auth/roles';

export default async function AdminNavigationPage() {
  await requirePageRole(ADMIN_ROLES);

  return (
    <div className="space-y-6">
      <NavigationSettingsSection />
    </div>
  );
}


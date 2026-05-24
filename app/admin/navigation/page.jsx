import NavigationSettingsSection from '@/modules/system/admin/NavigationSettingsSection';
import { requirePageModuleAccess } from '@/lib/auth/session';

export default async function AdminNavigationPage() {
  await requirePageModuleAccess('navigation');

  return (
    <div className="space-y-6">
      <NavigationSettingsSection />
    </div>
  );
}


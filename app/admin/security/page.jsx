import SecuritySettingsSection from '@/modules/system/admin/SecuritySettingsSection';
import { requirePageModuleAccess } from '@/lib/auth/session';

export default async function AdminSecurityPage() {
  await requirePageModuleAccess('security');

  return (
    <div className="space-y-6">
      <SecuritySettingsSection />
    </div>
  );
}


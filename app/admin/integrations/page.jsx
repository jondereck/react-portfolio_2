import IntegrationsSettingsSection from '@/modules/system/admin/IntegrationsSettingsSection';
import { requirePageRole } from '@/lib/auth/session';
import { ADMIN_ROLES } from '@/lib/auth/roles';

export default async function AdminIntegrationsPage() {
  await requirePageRole(ADMIN_ROLES);

  return (
    <div className="space-y-6">
      <IntegrationsSettingsSection />
    </div>
  );
}


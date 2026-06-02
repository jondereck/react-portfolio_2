import IntegrationsSettingsSection from '@/modules/system/admin/IntegrationsSettingsSection';
import { requirePageModuleAccess } from '@/lib/auth/session';

export default async function AdminIntegrationsPage() {
  await requirePageModuleAccess('integrations');

  return (
    <div className="space-y-6">
      <IntegrationsSettingsSection />
    </div>
  );
}


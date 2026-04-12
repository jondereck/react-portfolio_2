import SiteConfigSection from '@/modules/system/admin/SiteConfigSection';
import NavigationSettingsSection from '@/modules/system/admin/NavigationSettingsSection';
import IntegrationsSettingsSection from '@/modules/system/admin/IntegrationsSettingsSection';
import SecuritySettingsSection from '@/modules/system/admin/SecuritySettingsSection';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <SiteConfigSection />
      <NavigationSettingsSection />
      <IntegrationsSettingsSection />
      <SecuritySettingsSection />
    </div>
  );
}

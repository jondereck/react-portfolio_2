import SiteConfigSection from '@/modules/system/admin/SiteConfigSection';
import SettingsHashRedirect from '@/components/admin/settings/SettingsHashRedirect';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <SettingsHashRedirect />
      <SiteConfigSection />
    </div>
  );
}

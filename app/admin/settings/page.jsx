import SiteConfigSection from '@/modules/system/admin/SiteConfigSection';

function SettingsPlaceholderCard({ id, title, description }) {
  return (
    <section id={id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </section>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <SiteConfigSection />
      <SettingsPlaceholderCard
        id="navigation"
        title="Navigation Settings"
        description="Reserved route group for global navigation configuration and menu structures."
      />
      <SettingsPlaceholderCard
        id="integrations"
        title="Integrations"
        description="Reserved route group for third-party integrations, API keys, and connection states."
      />
      <SettingsPlaceholderCard
        id="security"
        title="Security & Access"
        description="Reserved route group for admin access controls, session policies, and audit features."
      />
    </div>
  );
}

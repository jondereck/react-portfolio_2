import { BriefcaseBusiness, Images, Settings2 } from 'lucide-react';
import AdminOverviewCard from '@/components/admin/shared/AdminOverviewCard';

const adminOverviewCards = [
  {
    title: 'Portfolio Administration',
    description: 'Manage homepage content, projects, skills, certificates, and experience entries.',
    href: '/admin/portfolio',
    icon: BriefcaseBusiness,
    badge: 'Module',
    accent: 'emerald',
  },
  {
    title: 'Gallery Administration',
    description: 'Manage albums, media, ordering, imports, and gallery details from one module workspace.',
    href: '/admin/gallery',
    icon: Images,
    badge: 'Module',
    accent: 'sky',
  },
  {
    title: 'System Settings',
    description: 'Manage global site settings plus navigation, integrations, and security configuration.',
    href: '/admin/settings',
    icon: Settings2,
    badge: 'Core',
    accent: 'amber',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold">Unified Admin Control Center</h2>
        <p className="mt-2 text-sm text-slate-500">
          Administration is organized by domain. Each module has its own overview and workspace pages to keep boundaries clear.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {adminOverviewCards.map((card) => (
          <AdminOverviewCard key={card.title} {...card} />
        ))}
      </section>

      <section id="future-modules" className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
        <h3 className="text-lg font-semibold">Future Modules</h3>
        <p className="mt-2 text-sm text-slate-500">
          This structure is ready for additional domains such as blog, testimonials, services, and bookings.
        </p>
      </section>
    </div>
  );
}

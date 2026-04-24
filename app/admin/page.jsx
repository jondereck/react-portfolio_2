import AdminDashboardShortcuts from '@/components/admin/dashboard/AdminDashboardShortcuts';
import { ADMIN_ROLES } from '@/lib/auth/roles';
import { requirePageRole } from '@/lib/auth/session';

export default async function AdminDashboardPage() {
  await requirePageRole(ADMIN_ROLES);

  return (
    <div className="space-y-6">



      <AdminDashboardShortcuts />

      <section id="future-modules" className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60">
        <h3 className="text-lg font-semibold">Future Modules</h3>
        <p className="mt-2 text-sm text-slate-500">
          This structure is ready for additional domains such as blog, testimonials, services, and bookings.
        </p>
      </section>
    </div>
  );
}

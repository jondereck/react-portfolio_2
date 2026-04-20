import AdminDashboardShortcuts from '@/components/admin/dashboard/AdminDashboardShortcuts';
import { ADMIN_ROLES } from '@/lib/auth/roles';
import { requirePageRole } from '@/lib/auth/session';

export default async function AdminDashboardPage() {
  await requirePageRole(ADMIN_ROLES);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Admin Control Center</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Administration is organized by domain. Add quick shortcuts here so you can jump directly to the pages you use most often.
            </p>
          </div>
        </div>
      </section>

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

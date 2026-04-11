export default function AdminMetricCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:mt-3 sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{hint}</p>
    </div>
  );
}

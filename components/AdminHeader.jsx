'use client';

export default function AdminHeader({ onLogout }) {
  return (
    <header className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-wide text-slate-500">Admin Console</p>
          <h1 className="text-3xl font-bold">Portfolio CMS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage front page content, portfolio, certificates, skills, and experience in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

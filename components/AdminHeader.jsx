import { Input } from '@/components/ui/input';

export default function AdminHeader({ adminKey, setAdminKey }) {
  return (
    <header className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm uppercase tracking-wide text-slate-500">Admin Console</p>
      <h1 className="text-3xl font-bold">Portfolio CMS</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Manage front page content, portfolio, certificates, skills, and experience in one place. Provide the admin API key to unlock write actions.
      </p>
      <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
        Admin API Key
        <Input
          type="password"
          value={adminKey}
          onChange={(event) => setAdminKey(event.target.value)}
          placeholder="Enter the value of ADMIN_API_KEY"
        />
      </label>
    </header>
  );
}

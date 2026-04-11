'use client';

export default function GalleryMobileWorkspaceNav({ tabs, activeTab, onSelectTab, disabledTabIds = [] }) {
  return (
    <div className="sticky top-3 z-20 md:hidden">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Workspace sections
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Switch between focused gallery admin views without loading the desktop card wall.
            </p>
          </div>
        </div>

        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const disabled = disabledTabIds.includes(tab.id);

            return (
              <button
                key={tab.id}
                type="button"
                className={`min-w-[7rem] shrink-0 rounded-2xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                } ${disabled ? 'opacity-50' : ''}`}
                disabled={disabled}
                onClick={() => onSelectTab(tab.id)}
              >
                <span className="block text-xs font-semibold uppercase tracking-[0.18em]">{tab.label}</span>
                <span className="mt-1 block text-[11px] leading-4 opacity-80">{tab.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

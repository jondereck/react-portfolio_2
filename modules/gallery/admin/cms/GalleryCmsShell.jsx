'use client';

export default function GalleryCmsShell({
  header,
  sidebar,
  main,
  inspector,
  mobileTabs,
  mobileFooterActions,
  sidebarCollapsed = false,
  embedded = false,
}) {
  // Tailwind needs these classes to be statically present for arbitrary grid template values.
  const desktopGridColumns = inspector
    ? sidebarCollapsed
      ? 'lg:grid-cols-[104px_minmax(0,1fr)_300px] xl:grid-cols-[104px_minmax(0,1fr)_340px]'
      : 'lg:grid-cols-[280px_minmax(0,1fr)_300px] xl:grid-cols-[280px_minmax(0,1fr)_340px]'
    : sidebarCollapsed
      ? 'lg:grid-cols-[104px_minmax(0,1fr)]'
      : 'lg:grid-cols-[280px_minmax(0,1fr)]';

  const shell = (
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 lg:rounded-[28px]">
      {header}

      <div className={`grid ${desktopGridColumns}`}>
        {sidebar}
        {mobileTabs}
        {main}
        {inspector}
      </div>

      {mobileFooterActions}
    </div>
  );

  if (embedded) {
    return shell;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-screen-2xl lg:px-6 lg:py-6 2xl:px-10 2xl:py-8">{shell}</div>
    </div>
  );
}

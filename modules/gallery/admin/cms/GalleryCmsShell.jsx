'use client';

export default function GalleryCmsShell({
  header,
  sidebar,
  main,
  inspector,
  mobileTabs,
  mobileFooterActions,
  embedded = false,
}) {
  const desktopGridColumns = inspector
    ? 'lg:grid-cols-[280px_minmax(0,1fr)_260px]'
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
      <div className="mx-auto max-w-7xl lg:px-6 lg:py-6">{shell}</div>
    </div>
  );
}

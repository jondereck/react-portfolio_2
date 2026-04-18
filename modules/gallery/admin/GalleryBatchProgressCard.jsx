'use client';

function truncateFileName(name, max = 32) {
  if (!name) return 'Processing item';
  if (name.length <= max) return name;

  const lastDot = name.lastIndexOf('.');
  const hasExt = lastDot > 0;
  const ext = hasExt ? name.slice(lastDot) : '';
  const base = hasExt ? name.slice(0, lastDot) : name;

  const allowedBaseLength = Math.max(8, max - ext.length - 1);
  return `${base.slice(0, allowedBaseLength)}...${ext}`;
}

function truncateText(text, max = 44) {
  if (!text) return '';
  const normalized = String(text).replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

export default function GalleryBatchProgressCard({
  progress,
  heading = 'Upload in progress',
  currentItemFallback = 'Processing item',
  currentItemTitle,
  itemUnit = 'file',
  uploadedLabel = 'Uploaded',
  skippedLabel = 'Skipped',
  failedLabel = 'Failed',
  lastResultPrefix = 'Most recent',
  className = '',
}) {
  if (!progress) return null;

  const unitLabel = itemUnit.charAt(0).toUpperCase() + itemUnit.slice(1);
  const lastResult = progress?.lastResult ?? null;

  return (
    <div className={`rounded-2xl border border-sky-200 bg-white/90 p-3 shadow-sm dark:border-sky-900/40 dark:bg-slate-900/80 sm:p-4 ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-600 dark:text-sky-300 sm:text-xs sm:tracking-[0.18em]">
            {heading}
          </p>

          <p
            className="mt-2 block w-full min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-slate-100"
            title={currentItemTitle || progress.currentFileName || currentItemFallback}
          >
            {truncateFileName(progress.currentFileName || currentItemFallback, 16)}
          </p>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {unitLabel} {progress.currentFileIndex ?? 0} of {progress.totalFiles ?? 0}
          </p>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-2 text-xs sm:grid-cols-3 md:w-auto md:flex-none">
          <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2.5 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200 sm:rounded-xl sm:px-3 sm:py-2">
            <p className="font-semibold">{progress.uploadedCount ?? 0}</p>
            <p>{uploadedLabel}</p>
          </div>

          <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2.5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 sm:rounded-xl sm:px-3 sm:py-2">
            <p className="font-semibold">{progress.skippedCount ?? 0}</p>
            <p>{skippedLabel}</p>
          </div>

          <div className="w-full rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2.5 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 sm:rounded-xl sm:px-3 sm:py-2">
            <p className="font-semibold">{progress.failedCount ?? 0}</p>
            <p>{failedLabel}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-sky-500 transition-[width] duration-150"
          style={{ width: `${Math.min(100, Math.max(0, progress.percent || 0))}%` }}
        />
      </div>

      <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span>{progress.percent ?? 0}% complete</span>

        {lastResult ? (
          <div className="w-full min-w-0 overflow-hidden sm:flex-1">
            <p
              className="block w-full min-w-0 overflow-hidden text-xs text-slate-500 dark:text-slate-400 sm:text-right"
              title={`${lastResult.fileName} · ${lastResult.reason}`}
            >
              <span className="break-all">
                {truncateText(
                  `${lastResultPrefix}: ${truncateFileName(lastResult.fileName, 18)} · ${lastResult.reason}`,
                  52,
                )}
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { Clock3, Image as ImageIcon, Loader2, TriangleAlert } from 'lucide-react';
import { getUnclothyGenerationModeLabel } from '@/lib/unclothy-settings';

function clampPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function phaseLabel(phase) {
  if (!phase) return 'Queued';
  if (phase === 'creating') return 'Creating';
  if (phase === 'processing') return 'Processing';
  if (phase === 'ingesting') return 'Saving';
  if (phase === 'done') return 'Done';
  if (phase === 'error') return 'Error';
  return 'Queued';
}

function TaskRow({ label, sublabel, icon: Icon, onClick, tone = 'default' }) {
  const toneClassName =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100'
      : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[22px] border p-3 text-left shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-900/60 ${toneClassName}`}
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{label}</span>
        {sublabel ? <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-300">{sublabel}</span> : null}
      </span>
    </button>
  );
}

export default function GalleryUnclothyTasksPanel({
  active,
  queue,
  onOpenTask,
  onCancelActive,
  onRetryActive,
  onDismissActive,
  onClearQueue,
  hideWhenEmpty = false,
}) {
  const queued = Array.isArray(queue) ? queue : [];
  const percent = clampPercent(active?.percent);
  const activeGenerationMode = getUnclothyGenerationModeLabel(active?.settingsSent) || getUnclothyGenerationModeLabel(active?.settingsSnapshot);

  const activeTitle = useMemo(() => {
    if (!active) return null;
    const status = active.statusText || phaseLabel(active.phase);
    const provider = active.providerStatus ? ` (${active.providerStatus})` : '';
    return `${status}${provider}`;
  }, [active]);

  const hasTasks = Boolean(active) || queued.length > 0;

  if (!hasTasks) {
    if (hideWhenEmpty) {
      return null;
    }
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        No generation tasks running.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {active ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Currently running</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">{phaseLabel(active.phase)}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Album {active.albumId} • Image {active.sourcePhotoId}
                {activeGenerationMode ? ` • ${activeGenerationMode}` : ''}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{percent}%</span>
          </div>

          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-sky-500 transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">{activeTitle}</span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => onOpenTask?.({ albumId: active.albumId, sourcePhotoId: active.sourcePhotoId })}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Open
            </button>
          </div>

          {active.phase !== 'error' && active.phase !== 'done' ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => onCancelActive?.()}
              >
                <Loader2 className="h-4 w-4" />
                Cancel
              </button>
            </div>
          ) : null}

          {active.phase === 'error' ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2 rounded-[22px] border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="leading-6">{active.errorMessage || active.statusText || 'Task failed.'}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => onDismissActive?.()}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => onRetryActive?.()}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {queued.length > 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Pending queue</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">{queued.length} task(s)</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={() => onClearQueue?.()}
            >
              Clear
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {queued.map((task, index) => (
              <TaskRow
                key={task.queueTaskId || `${task.albumId}:${task.sourcePhotoId}:${task.createdAt || index}`}
                icon={Clock3}
                label={`Queued #${index + 1} • Album ${task.albumId}`}
                sublabel={`Image ${task.sourcePhotoId}${getUnclothyGenerationModeLabel(task.settingsSnapshot) ? ` • ${getUnclothyGenerationModeLabel(task.settingsSnapshot)}` : ''}`}
                onClick={() => onOpenTask?.({ albumId: task.albumId, sourcePhotoId: task.sourcePhotoId })}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

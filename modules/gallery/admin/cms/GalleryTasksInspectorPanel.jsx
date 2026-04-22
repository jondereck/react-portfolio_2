'use client';

import GalleryUnclothyTasksPanel from '@/modules/gallery/admin/GalleryUnclothyTasksPanel';

export default function GalleryTasksInspectorPanel({
  active,
  activeTasks,
  failedTasks,
  completedTasks,
  queue,
  onOpenTask,
  onCancelActive,
  onRetryActive,
  onDismissActive,
  onCancelQueued,
  onClearQueue,
}) {
  return (
    <aside className="hidden border-l border-slate-200 bg-slate-50/40 p-3 lg:block dark:border-slate-800 dark:bg-slate-950/20">
      <div className="sticky top-28">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Generation
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">Tasks</h2>
          </div>
        </div>

        <div className="mt-3">
          <GalleryUnclothyTasksPanel
            active={active}
            activeTasks={activeTasks}
            failedTasks={failedTasks}
            completedTasks={completedTasks}
            queue={queue}
            onOpenTask={onOpenTask}
            onCancelActive={onCancelActive}
            onRetryActive={onRetryActive}
            onDismissActive={onDismissActive}
            onCancelQueued={onCancelQueued}
            onClearQueue={onClearQueue}
            hideWhenEmpty={false}
          />
        </div>
      </div>
    </aside>
  );
}

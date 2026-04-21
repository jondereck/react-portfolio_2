'use client';

import { ChevronsUpDown, X } from 'lucide-react';

export default function GallerySelectionActionsPopup({
  open,
  selectedCount,
  disabled = false,
  targetAlbumName = null,
  onPickAlbum,
  onMove,
  onCreateAlbum,
  onBlurModeChange,
  onDelete,
  onClear,
  savingBlurMode = false,
}) {
  if (!open || !selectedCount) return null;

  const canMove = Boolean(targetAlbumName) && !disabled;
  const blurDisabled = disabled || savingBlurMode || typeof onBlurModeChange !== 'function';

  return (
    <>
      {/* Mobile */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 px-4 lg:hidden">
        <div className="pointer-events-auto mx-auto max-w-md rounded-[30px] border border-slate-200 bg-white/95 p-3 shadow-2xl ring-1 ring-slate-200 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:ring-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white dark:bg-slate-50 dark:text-slate-900">
                  {selectedCount}
                </span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {selectedCount} media item{selectedCount === 1 ? '' : 's'} selected
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Move, add to album, or delete without leaving the grid.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={onClear}
              disabled={disabled}
              aria-label="Clear selection"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 rounded-[22px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Add to album
            </label>
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
              onClick={onPickAlbum}
              disabled={disabled}
            >
              <span className="truncate">{targetAlbumName || 'Select album'}</span>
              <ChevronsUpDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="mt-3 rounded-[22px] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Blur mode
            </label>
            <select
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
              defaultValue=""
              disabled={blurDisabled}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (!nextValue) return;
                onBlurModeChange?.(nextValue);
                event.target.value = '';
              }}
            >
              <option value="" disabled>
                {savingBlurMode ? 'Saving...' : 'Set blur mode'}
              </option>
              <option value="auto">Auto</option>
              <option value="force_blur">Force blur</option>
              <option value="force_unblur">Force unblur</option>
            </select>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
              onClick={onMove}
              disabled={!canMove}
            >
              Move
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-950/50"
              onClick={onCreateAlbum}
              disabled={disabled}
            >
              Create album
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
              onClick={onDelete}
              disabled={disabled}
            >
              Delete
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={onClear}
              disabled={disabled}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 hidden px-6 lg:block">
        <div className="pointer-events-auto mx-auto flex w-full max-w-5xl items-center gap-4 rounded-[28px] border border-slate-200 bg-white/95 p-3 shadow-2xl ring-1 ring-slate-200 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:ring-slate-800">
          <div className="flex min-w-[240px] items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/40">
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white dark:bg-slate-50 dark:text-slate-900">
              {selectedCount}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                {selectedCount} media selected
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                Bulk actions stay visible while browsing the grid.
              </p>
            </div>
          </div>

          <div className="min-w-[240px] flex-1 rounded-[22px] border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Add to album
            </label>
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
              onClick={onPickAlbum}
              disabled={disabled}
            >
              <span className="truncate">{targetAlbumName || 'Select album'}</span>
              <ChevronsUpDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div className="min-w-[180px] rounded-[22px] border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Blur mode
            </label>
            <select
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
              defaultValue=""
              disabled={blurDisabled}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (!nextValue) return;
                onBlurModeChange?.(nextValue);
                event.target.value = '';
              }}
            >
              <option value="" disabled>
                {savingBlurMode ? 'Saving...' : 'Set mode'}
              </option>
              <option value="auto">Auto</option>
              <option value="force_blur">Force blur</option>
              <option value="force_unblur">Force unblur</option>
            </select>
          </div>

          <div className="grid w-[220px] shrink-0 grid-cols-2 gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
              onClick={onMove}
              disabled={!canMove}
            >
              Move
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-2xl border border-sky-200 bg-sky-50 px-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200 dark:hover:bg-sky-950/50"
              onClick={onCreateAlbum}
              disabled={disabled}
            >
              Create album
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-2xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
              onClick={onDelete}
              disabled={disabled}
            >
              Delete
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={onClear}
              disabled={disabled}
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

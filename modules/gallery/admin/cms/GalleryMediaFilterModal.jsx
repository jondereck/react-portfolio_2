'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import GalleryCmsModal from './GalleryCmsModal';

const options = [
  {
    id: 'custom',
    title: 'Manual arrangement',
    description: 'Use the saved drag-and-drop order (Arrange page).',
  },
  {
    id: 'dateDesc',
    title: 'Newest first',
    description: 'Sort by date taken (fallback: uploaded date).',
  },
  {
    id: 'dateAsc',
    title: 'Oldest first',
    description: 'Sort by date taken (fallback: uploaded date).',
  },
];

export default function GalleryMediaFilterModal({ open, onClose, sortMode = 'custom', onApplySort }) {
  const [pendingSort, setPendingSort] = useState(sortMode);

  useEffect(() => {
    if (!open) return;
    setPendingSort(sortMode);
  }, [open, sortMode]);

  const activeOption = useMemo(() => options.find((option) => option.id === pendingSort) ?? options[0], [pendingSort]);
  const canApply = pendingSort && pendingSort !== sortMode;

  return (
    <GalleryCmsModal
      open={open}
      onClose={() => {
        setPendingSort(sortMode);
        onClose?.();
      }}
      title="Filter & sort"
      description="Switch the album ordering without leaving the media page."
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Sort</p>
          <div className="mt-3 space-y-2">
            {options.map((option) => {
              const isSelected = option.id === pendingSort;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPendingSort(option.id)}
                  className={`w-full rounded-[22px] border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-50 dark:bg-slate-50 dark:text-slate-900'
                      : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{option.title}</p>
                      <p className={`mt-1 text-xs ${isSelected ? 'text-slate-200 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>
                        {option.description}
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 dark:bg-slate-900/10">
                        <Check className="h-4 w-4" />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Selected</p>
          <p className="mt-1">{activeOption?.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
            onClick={() => {
              setPendingSort(sortMode);
              onClose?.();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canApply}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-60 dark:bg-slate-50 dark:text-slate-900"
            onClick={() => {
              if (!pendingSort) return;
              onApplySort?.(pendingSort);
              onClose?.();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </GalleryCmsModal>
  );
}


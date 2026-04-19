'use client';

import { SlidersHorizontal } from 'lucide-react';

export default function GalleryMediaToolbar({
  searchValue,
  onSearchChange,
  activeChip,
  chips,
  onChipChange,
  onOpenFilter,
}) {
  return (
    <div className="px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Media library</h2>

        </div>


      </div>

      <div className="mt-4 lg:hidden">
        <input
          id="gallery-media-search"
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder="Search media"
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
        />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => {
          const isActive = chip.id === activeChip;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onChipChange?.(chip.id)}
              className={`whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900'
                  : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-900/60'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

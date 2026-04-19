'use client';

import { ArrowLeft, FolderOpen, Search, SlidersHorizontal, Upload } from 'lucide-react';

export default function GalleryCmsHeader({
  albumName,
  albumCountLabel,
  searchValue,
  onSearchChange,
  onOpenFilter,
  onOpenImport,
  onOpenUpload,
  showMobileBack = false,
  onMobileBack,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5 lg:px-6">
        {showMobileBack ? (
          <button
            type="button"
            onClick={onMobileBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300 lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            Gallery CMS
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50 sm:text-lg">
              {albumName || 'Media'}
            </h1>
            {albumCountLabel ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
                {albumCountLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="flex h-11 w-72 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-950/40">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Search media"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-50"
            />
          </div>

          <button
            type="button"
            onClick={onOpenFilter}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </button>

          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
          >
            <FolderOpen className="h-4 w-4" />
            Import
          </button>

          <button
            type="button"
            onClick={onOpenUpload}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-900 px-3 text-sm font-medium text-white shadow-sm dark:bg-slate-100 dark:text-slate-900 lg:hidden"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>
    </header>
  );
}


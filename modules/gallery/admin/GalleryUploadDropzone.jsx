'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, Check, CloudUpload, FolderInput, X } from 'lucide-react';

export default function GalleryUploadDropzone({
  title = 'Upload files',
  description = 'Drag and drop images or videos here, or choose files from your device.',
  helpText = 'Uploads go directly into the selected album.',
  uploadLabel = 'Choose files',
  uploading = false,
  uploadProgress = null,
  uploadSummary = null,
  onUploadFiles,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleFiles = async (files) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) return;

    await onUploadFiles?.(nextFiles);
  };

  const hasSummary = uploadSummary && uploadSummary.totalFiles > 0;
  const resultEntries = Array.isArray(uploadSummary?.results) ? uploadSummary.results : [];
  const flaggedEntries = resultEntries.filter((entry) => entry.status !== 'success');
  const lastResult = uploadProgress?.lastResult ?? resultEntries[resultEntries.length - 1] ?? null;

  return (
    <div
      className={`rounded-2xl border border-dashed p-4 transition sm:p-5 ${
        isDragging
          ? 'border-sky-400 bg-sky-50 dark:border-sky-500/60 dark:bg-sky-950/20'
          : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/30'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setIsDragging(false);
        await handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
          <CloudUpload className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{helpText}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
          onClick={openPicker}
          disabled={uploading}
        >
          <FolderInput className="size-4" />
          {uploadLabel}
        </button>

        {!uploading ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasSummary
              ? `Last batch: ${uploadSummary.uploadedCount} uploaded · ${uploadSummary.skippedCount} skipped · ${uploadSummary.failedCount} failed`
              : 'Drop files anywhere in this box.'}
          </p>
        ) : null}
      </div>

      {uploading && uploadProgress ? (
        <div className="mt-4 rounded-2xl border border-sky-200 bg-white/90 p-3 shadow-sm dark:border-sky-900/40 dark:bg-slate-900/80 sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                Upload in progress
              </p>
              <p
                className="mt-2 block max-w-full break-words text-sm font-semibold text-slate-900 dark:text-slate-100 sm:truncate"
                title={uploadProgress.currentFileName || 'Uploading file'}
              >
                {uploadProgress.currentFileName || 'Uploading file'}
              </p>
              <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
                File {uploadProgress.currentFileIndex} of {uploadProgress.totalFiles}
              </p>
            </div>
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 text-xs sm:grid-cols-3 md:w-auto md:flex-none">
              <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="font-semibold">{uploadProgress.uploadedCount ?? 0}</p>
                <p>Uploaded</p>
              </div>
              <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">{uploadProgress.skippedCount ?? 0}</p>
                <p>Skipped</p>
              </div>
              <div className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                <p className="font-semibold">{uploadProgress.failedCount ?? 0}</p>
                <p>Failed</p>
              </div>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-150"
              style={{ width: `${Math.min(100, Math.max(0, uploadProgress.percent || 0))}%` }}
            />
          </div>

          <div className="mt-2 flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span>{uploadProgress.percent}% complete</span>
            {lastResult ? (
              <span
                className="block w-full min-w-0 break-words text-left sm:flex-1 sm:truncate sm:text-right"
                title={lastResult.fileName}
              >
                {lastResult.status === 'duplicate-skipped'
                  ? `Latest duplicate skipped: ${lastResult.fileName}`
                  : lastResult.status === 'error'
                    ? `Latest error: ${lastResult.fileName}`
                    : `Latest uploaded: ${lastResult.fileName}`}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasSummary ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
              <div className="flex items-center gap-2">
                <Check className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Uploaded</p>
              </div>
              <p className="mt-2 text-lg font-semibold">{uploadSummary.uploadedCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <div className="flex items-center gap-2">
                <X className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Duplicates</p>
              </div>
              <p className="mt-2 text-lg font-semibold">{uploadSummary.skippedCount}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Failed</p>
              </div>
              <p className="mt-2 text-lg font-semibold">{uploadSummary.failedCount}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Processed {uploadSummary.totalFiles} file{uploadSummary.totalFiles === 1 ? '' : 's'}
            </p>
            {lastResult ? (
              <p
                className="w-full min-w-0 break-words text-xs text-slate-500 dark:text-slate-400 sm:flex-1 sm:truncate sm:text-right"
                title={`${lastResult.fileName} · ${lastResult.reason}`}
              >
                Most recent: {lastResult.fileName} · {lastResult.reason}
              </p>
            ) : null}
          </div>

          {flaggedEntries.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Skipped and failed files
              </p>
              <div className="space-y-2">
                {flaggedEntries.map((entry, index) => (
                  <div
                    key={`${entry.fileName}-${entry.status}-${index}`}
                    className={`rounded-xl border px-3 py-3 text-sm ${
                      entry.status === 'duplicate-skipped'
                        ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100'
                        : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100'
                    }`}
                  >
                    <p className="min-w-0 break-words font-semibold" title={entry.fileName}>
                      {entry.fileName}
                    </p>
                    <p className="mt-1 text-xs opacity-80">{entry.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/*,video/*"
        multiple
        disabled={uploading}
        onChange={async (event) => {
          await handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}

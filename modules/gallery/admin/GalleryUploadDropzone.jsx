'use client';

import { useRef, useState } from 'react';
import { CloudUpload, FolderInput } from 'lucide-react';

export default function GalleryUploadDropzone({
  title = 'Upload files',
  description = 'Drag and drop images or videos here, or choose files from your device.',
  helpText = 'Uploads go directly into the selected album.',
  uploadLabel = 'Choose files',
  uploading = false,
  uploadProgress = null,
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

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={openPicker}
          disabled={uploading}
        >
          <FolderInput className="size-4" />
          {uploadLabel}
        </button>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {uploading && uploadProgress
            ? `Uploading ${uploadProgress.currentFileIndex} of ${uploadProgress.totalFiles} · ${uploadProgress.percent}%`
            : uploading
              ? 'Uploading files...'
              : 'Drop files anywhere in this box.'}
        </p>
      </div>

      {uploading && uploadProgress ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">
              {uploadProgress.currentFileName || 'Uploading file'}
            </span>
            <span>{uploadProgress.percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-150"
              style={{ width: `${Math.min(100, Math.max(0, uploadProgress.percent || 0))}%` }}
            />
          </div>
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

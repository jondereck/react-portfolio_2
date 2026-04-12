'use client';

import { uploadFormDataWithProgress } from './galleryAdminShared';

export function createEmptyUploadSummary() {
  return {
    totalFiles: 0,
    uploadedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    results: [],
  };
}

const pluralize = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

export function isDuplicateUploadError(error) {
  return error?.errorCode === 'DUPLICATE_MEDIA';
}

export function getUploadResultReason(error) {
  if (isDuplicateUploadError(error)) {
    return error.message || 'Duplicate media already exists in this album.';
  }

  return error?.message || 'Upload failed.';
}

export function getUploadSummaryToast(summary) {
  if (!summary || summary.totalFiles === 0) {
    return 'No files were processed.';
  }

  const parts = [];
  if (summary.uploadedCount > 0) {
    parts.push(pluralize(summary.uploadedCount, 'file'));
  }
  if (summary.skippedCount > 0) {
    parts.push(`${pluralize(summary.skippedCount, 'duplicate')} skipped`);
  }
  if (summary.failedCount > 0) {
    parts.push(`${pluralize(summary.failedCount, 'file')} failed`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'No files were processed.';
}

export async function uploadAlbumFiles({
  albumId,
  files,
  onProgressChange,
}) {
  const nextFiles = Array.from(files || []);
  if (!albumId || nextFiles.length === 0) {
    const emptySummary = createEmptyUploadSummary();
    onProgressChange?.(null);
    return emptySummary;
  }

  const totalBytes = Math.max(nextFiles.reduce((sum, file) => sum + (file.size || 0), 0), 1);
  let completedBytes = 0;
  let uploadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const results = [];

  const emitProgress = (file, index) => {
    onProgressChange?.({
      percent: Math.min(100, Math.round((completedBytes / totalBytes) * 100)),
      currentFileName: file?.name ?? '',
      currentFileIndex: index + 1,
      totalFiles: nextFiles.length,
      uploadedCount,
      skippedCount,
      failedCount,
      lastResult: results[results.length - 1] ?? null,
    });
  };

  emitProgress(nextFiles[0], 0);

  for (let index = 0; index < nextFiles.length; index += 1) {
    const file = nextFiles[index];
    const formData = new FormData();
    formData.append('imageFile', file);
    formData.append('caption', file.name);

    emitProgress(file, index);

    try {
      await uploadFormDataWithProgress(`/api/gallery/albums/${albumId}/photos`, formData, {
        onProgress: ({ loaded }) => {
          const progressBytes = completedBytes + Math.min(loaded, file.size || loaded);
          onProgressChange?.({
            percent: Math.min(100, Math.round((progressBytes / totalBytes) * 100)),
            currentFileName: file.name,
            currentFileIndex: index + 1,
            totalFiles: nextFiles.length,
            uploadedCount,
            skippedCount,
            failedCount,
            lastResult: results[results.length - 1] ?? null,
          });
        },
      });

      uploadedCount += 1;
      results.push({
        fileName: file.name,
        status: 'success',
        reason: 'Uploaded successfully.',
      });
    } catch (error) {
      const duplicate = isDuplicateUploadError(error);
      if (duplicate) {
        skippedCount += 1;
      } else {
        failedCount += 1;
      }

      results.push({
        fileName: file.name,
        status: duplicate ? 'duplicate-skipped' : 'error',
        reason: getUploadResultReason(error),
        errorCode: error?.errorCode,
        duplicate: error?.duplicate ?? null,
      });
    }

    completedBytes += file.size || 0;
    emitProgress(file, index);
  }

  return {
    totalFiles: nextFiles.length,
    uploadedCount,
    skippedCount,
    failedCount,
    results,
  };
}

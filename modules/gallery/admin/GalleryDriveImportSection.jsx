'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  buttonStyles,
  ghostButtonStyles,
  inputStyles,
} from './galleryAdminShared';
import GalleryBatchProgressCard from './GalleryBatchProgressCard';
import GalleryBatchResultSummary from './GalleryBatchResultSummary';
import GalleryDriveFolderPicker from './GalleryDriveFolderPicker';

const emptyDriveConnection = {
  loading: true,
  featureEnabled: true,
  oauthConfigured: true,
  connected: false,
  expiresAt: null,
  hasRefreshToken: false,
  scope: null,
};

export default function GalleryDriveImportSection({ controller, selectedAlbum, variant = 'full' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    driveForm,
    setDriveForm,
    importingDrive,
    importProgress,
    importSummary,
    handleDriveImport,
  } = controller;
  const [driveConnection, setDriveConnection] = useState(emptyDriveConnection);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const clearDriveSelection = () => {
    setDriveForm((previous) => ({
      ...previous,
      folderId: '',
      folderName: '',
      breadcrumbs: [],
      mediaCount: null,
    }));
  };

  const loadDriveConnection = async () => {
    setDriveConnection((current) => ({ ...current, loading: true }));

    try {
      const response = await fetch('/api/admin/integrations/google-drive', {
        method: 'GET',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load Google Drive connection status.');
      }

      setDriveConnection({
        loading: false,
        featureEnabled: payload.featureEnabled !== false,
        oauthConfigured: payload.oauthConfigured !== false,
        connected: Boolean(payload.connected),
        expiresAt: typeof payload.expiresAt === 'number' ? payload.expiresAt : null,
        hasRefreshToken: Boolean(payload.hasRefreshToken),
        scope: typeof payload.scope === 'string' ? payload.scope : null,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load Google Drive connection status.');
      setDriveConnection({
        ...emptyDriveConnection,
        loading: false,
        featureEnabled: false,
        oauthConfigured: false,
      });
    }
  };

  useEffect(() => {
    loadDriveConnection();
  }, []);

  useEffect(() => {
    const driveState = searchParams.get('googleDrive');
    if (!driveState) {
      return;
    }

    if (driveState === 'connected') {
      toast.success('Google Drive connected.');
      loadDriveConnection();
    } else if (driveState === 'already-linked') {
      toast.error('This Google account is already linked to another admin.');
    } else if (driveState === 'connect-denied') {
      toast.error('Google Drive connection was not completed.');
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete('googleDrive');
    const nextQuery = params.toString();
    router.replace(nextQuery ? `?${nextQuery}` : window.location.pathname, { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (driveConnection.loading) {
      return;
    }

    if (!driveConnection.connected || !driveConnection.featureEnabled || !driveConnection.oauthConfigured) {
      clearDriveSelection();
    }
  }, [
    driveConnection.connected,
    driveConnection.featureEnabled,
    driveConnection.loading,
    driveConnection.oauthConfigured,
  ]);

  const handleConnectGoogleDrive = async () => {
    setConnectionBusy(true);

    try {
      const response = await fetch('/api/admin/integrations/google-drive', {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to start Google Drive connection.');
      }

      await signIn('google', {
        callbackUrl: window.location.href,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to connect Google Drive.');
      setConnectionBusy(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    setConnectionBusy(true);

    try {
      const response = await fetch('/api/admin/integrations/google-drive', {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to disconnect Google Drive.');
      }

      toast.success('Google Drive disconnected.');
      clearDriveSelection();
      await loadDriveConnection();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to disconnect Google Drive.');
    } finally {
      setConnectionBusy(false);
    }
  };

  const importDisabled =
    importingDrive ||
    driveConnection.loading ||
    !driveConnection.featureEnabled ||
    !driveConnection.oauthConfigured ||
    !driveConnection.connected ||
    !driveForm.folderId;

  const connectionTone = useMemo(() => {
    if (!driveConnection.featureEnabled) {
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200';
    }
    if (!driveConnection.oauthConfigured) {
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200';
    }
    if (driveConnection.connected) {
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200';
    }
    return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200';
  }, [driveConnection.connected, driveConnection.featureEnabled, driveConnection.oauthConfigured]);

  const connectionLabel = !driveConnection.featureEnabled
    ? 'Disabled globally'
    : !driveConnection.oauthConfigured
      ? 'OAuth setup required'
      : driveConnection.connected
        ? 'Connected'
        : 'Not connected';

  const folderPreview = driveForm.folderName?.trim() || driveForm.folderId.trim() || '...';
  const folderPathPreview = Array.isArray(driveForm.breadcrumbs)
    ? driveForm.breadcrumbs.map((entry) => entry?.name).filter(Boolean).join(' / ')
    : '';
  const effectiveImportTotal = Math.min(
    Math.max(1, Number(driveForm.limit) || 50),
    typeof driveForm.mediaCount === 'number' ? driveForm.mediaCount : Number(driveForm.limit) || 50,
  );

  return (
    <div className="space-y-4">
      {variant === 'compact' ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Import from Drive</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Connect, browse a folder, and import directly into the active album.
              </p>
            </div>
          </div>

          <div className={`mt-4 rounded-2xl border px-3 py-3 ${connectionTone}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">{connectionLabel}</p>
            <p className="mt-1 text-sm opacity-90">
              {driveConnection.connected
                ? 'Google Drive is ready for import.'
                : 'Connect Google Drive to browse a folder and import media.'}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {driveConnection.connected ? (
              <>
                <button
                  type="button"
                  className={buttonStyles}
                  disabled={
                    connectionBusy ||
                    driveConnection.loading ||
                    !driveConnection.featureEnabled ||
                    !driveConnection.oauthConfigured ||
                    !driveConnection.connected
                  }
                  onClick={() => setPickerOpen(true)}
                >
                  Browse Google Drive
                </button>
                <button
                  type="button"
                  className={ghostButtonStyles}
                  disabled={connectionBusy || driveConnection.loading}
                  onClick={handleDisconnectGoogleDrive}
                >
                  {connectionBusy ? 'Disconnecting...' : 'Disconnect Google Drive'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={buttonStyles}
                disabled={
                  connectionBusy ||
                  driveConnection.loading ||
                  !driveConnection.featureEnabled ||
                  !driveConnection.oauthConfigured
                }
                onClick={handleConnectGoogleDrive}
              >
                {connectionBusy ? 'Redirecting...' : 'Connect Google Drive'}
              </button>
            )}
          </div>

          {driveForm.folderId ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Selected folder</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                {driveForm.folderName || 'Google Drive folder'}
              </p>
              <div className="mt-3 grid gap-2">
                <form className="grid gap-2" onSubmit={handleDriveImport}>
                  <input
                    className={inputStyles}
                    type="number"
                    min={1}
                    max={200}
                    value={driveForm.limit}
                    onChange={(event) => setDriveForm((previous) => ({ ...previous, limit: event.target.value }))}
                    disabled={importDisabled}
                  />
                  <button className={buttonStyles} disabled={importDisabled}>
                    {importingDrive ? 'Importing…' : 'Import folder'}
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {importingDrive && importProgress ? (
            <GalleryBatchProgressCard
              progress={importProgress}
              heading="Google Drive import in progress"
              currentItemFallback="Importing Google Drive folder"
              currentItemTitle={importProgress.currentFileName || 'Importing Google Drive folder'}
              itemUnit="item"
              uploadedLabel="Imported"
              skippedLabel="Skipped"
              failedLabel="Failed"
              className="mt-4"
            />
          ) : null}

          {importSummary ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Last import summary</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Imported against an effective total of {effectiveImportTotal} item{effectiveImportTotal === 1 ? '' : 's'}.
                </p>
              </div>

              <GalleryBatchResultSummary
                summary={importSummary}
                uploadedLabel="Imported"
                skippedLabel="Duplicates"
                failedLabel="Failed"
                flaggedHeading="Duplicate and failed imports"
              />
            </div>
          ) : null}

          <GalleryDriveFolderPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            selectedFolderId={driveForm.folderId}
            onSelectFolder={(folder) => {
              setDriveForm((previous) => ({
                ...previous,
                folderId: folder.id,
                folderName: folder.name,
                breadcrumbs: Array.isArray(folder.breadcrumbs) ? folder.breadcrumbs : [],
                mediaCount: typeof folder.mediaCount === 'number' ? folder.mediaCount : null,
              }));
            }}
          />
        </div>
      ) : null}

      {variant === 'compact' ? null : (
        <div className="space-y-4">
          <div className={`rounded-xl border px-4 py-4 ${connectionTone}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Google Drive connection</p>
                <p className="mt-2 text-sm font-semibold">{connectionLabel}</p>
                <p className="mt-3 text-xs opacity-80">
                  Connect Drive, pick a folder, and import its media directly into{' '}
                  {selectedAlbum?.name || 'the selected album'}.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {driveConnection.connected ? (
                  <button
                    type="button"
                    className={ghostButtonStyles}
                    disabled={connectionBusy || driveConnection.loading}
                    onClick={handleDisconnectGoogleDrive}
                  >
                    {connectionBusy ? 'Disconnecting...' : 'Disconnect Google Drive'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={buttonStyles}
                    disabled={
                      connectionBusy ||
                      driveConnection.loading ||
                      !driveConnection.featureEnabled ||
                      !driveConnection.oauthConfigured
                    }
                    onClick={handleConnectGoogleDrive}
                  >
                    {connectionBusy ? 'Redirecting...' : 'Connect Google Drive'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Drive source folder
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {driveForm.folderId ? 'Selected folder is ready to import.' : 'Browse Google Drive and choose a folder to import.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonStyles}
                  disabled={
                    connectionBusy ||
                    driveConnection.loading ||
                    !driveConnection.featureEnabled ||
                    !driveConnection.oauthConfigured ||
                    !driveConnection.connected
                  }
                  onClick={() => setPickerOpen(true)}
                >
                  {driveForm.folderId ? 'Change folder' : 'Browse Google Drive'}
                </button>
                {driveForm.folderId ? (
                  <button
                    type="button"
                    className={ghostButtonStyles}
                    onClick={clearDriveSelection}
                    disabled={importingDrive}
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>
            </div>

            {driveForm.folderId ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                  {driveForm.folderName || 'Selected Google Drive folder'}
                </p>
                {folderPathPreview ? (
                  <p className="mt-1 text-xs text-emerald-900/80 dark:text-emerald-100/80">{folderPathPreview}</p>
                ) : null}
                <details className="mt-3 text-xs text-emerald-900/80 dark:text-emerald-100/80">
                  <summary className="cursor-pointer font-medium">Advanced details</summary>
                  <p className="mt-2 break-all">Folder ID: {driveForm.folderId}</p>
                  <p className="mt-1">
                    {typeof driveForm.mediaCount === 'number'
                      ? `Exact media in folder: ${driveForm.mediaCount}`
                      : 'Media count is unavailable until the folder selection finishes loading.'}
                  </p>
                  <p className="mt-1">Importing this run: {effectiveImportTotal}</p>
                </details>
              </div>
            ) : null}

            <form className="mt-4 grid gap-3 md:grid-cols-[120px_auto]" onSubmit={handleDriveImport}>
              <input
                className={inputStyles}
                type="number"
                min={1}
                max={200}
                value={driveForm.limit}
                onChange={(event) => setDriveForm((previous) => ({ ...previous, limit: event.target.value }))}
                disabled={
                  importingDrive ||
                  driveConnection.loading ||
                  !driveConnection.featureEnabled ||
                  !driveConnection.oauthConfigured ||
                  !driveConnection.connected
                }
              />
              <button className={buttonStyles} disabled={importDisabled}>
                {importingDrive ? 'Importing...' : 'Import Folder'}
              </button>
            </form>

            {importingDrive && importProgress ? (
              <GalleryBatchProgressCard
                progress={importProgress}
                heading="Google Drive import in progress"
                currentItemFallback="Importing Google Drive folder"
                currentItemTitle={importProgress.currentFileName || 'Importing Google Drive folder'}
                itemUnit="item"
                uploadedLabel="Imported"
                skippedLabel="Skipped"
                failedLabel="Failed"
                className="mt-4"
              />
            ) : null}

            {importSummary ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Last import summary</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Imported against an effective total of {effectiveImportTotal} item{effectiveImportTotal === 1 ? '' : 's'}.
                  </p>
                </div>

                <GalleryBatchResultSummary
                  summary={importSummary}
                  uploadedLabel="Imported"
                  skippedLabel="Duplicates"
                  failedLabel="Failed"
                  flaggedHeading="Duplicate and failed imports"
                />
              </div>
            ) : null}

            <GalleryDriveFolderPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              selectedFolderId={driveForm.folderId}
              onSelectFolder={(folder) => {
                setDriveForm((previous) => ({
                  ...previous,
                  folderId: folder.id,
                  folderName: folder.name,
                  breadcrumbs: Array.isArray(folder.breadcrumbs) ? folder.breadcrumbs : [],
                  mediaCount: typeof folder.mediaCount === 'number' ? folder.mediaCount : null,
                }));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

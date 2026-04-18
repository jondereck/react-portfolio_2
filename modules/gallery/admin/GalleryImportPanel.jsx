'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { toast } from 'sonner';
import {
  GalleryAlbumPicker,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  ghostButtonStyles,
  inputStyles,
} from './galleryAdminShared';

const emptyDriveConnection = {
  loading: true,
  featureEnabled: true,
  oauthConfigured: true,
  connected: false,
  expiresAt: null,
  hasRefreshToken: false,
  scope: null,
};

export default function GalleryImportPanel({ controller, embedded = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    albums,
    selectedAlbum,
    selectedAlbumId,
    loadingAlbums,
    driveForm,
    setDriveForm,
    importingDrive,
    importSummary,
    handleDriveImport,
    setSelectedAlbumId,
  } = controller;
  const [driveConnection, setDriveConnection] = useState(emptyDriveConnection);
  const [connectionBusy, setConnectionBusy] = useState(false);

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
    !driveConnection.connected;

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

  const connectionDescription = !driveConnection.featureEnabled
    ? 'Google Drive imports are disabled in system settings.'
    : !driveConnection.oauthConfigured
      ? 'Add Google OAuth client credentials on the server before admins can connect Drive.'
      : driveConnection.connected
        ? 'This admin account can import Google Drive images without pasting an access token.'
        : 'Connect your Google account once, then import Drive images using only the folder ID.';

  const folderPreview = driveForm.folderId.trim() || '...';

  return (
    <div className="space-y-6">
      {!embedded ? (
        <GalleryPageHeader
          eyebrow="Import Workflow"
          title="Import"
          description="Import Google Drive media into a selected album with duplicate-aware handling and a focused workflow."
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <GalleryAlbumPicker
          albums={albums}
          selectedAlbumId={selectedAlbumId}
          loadingAlbums={loadingAlbums}
          onSelectAlbum={setSelectedAlbumId}
          emptyDescription="Create an album before importing external media."
        />

        {selectedAlbum ? (
          <div className="space-y-6">
            <GalleryPanelCard
              title={`Import into ${selectedAlbum.name}`}
              description="The import route is intentionally limited to import-related controls."
            >
              <div className="space-y-4">
                <div className={`rounded-xl border px-4 py-4 ${connectionTone}`}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Google Drive connection</p>
                      <p className="mt-2 text-sm font-semibold">{connectionLabel}</p>
                      <p className="mt-1 text-sm opacity-90">{connectionDescription}</p>
                      <p className="mt-3 text-xs opacity-80">
                        Imported images stay linked to Google Drive in this version. Folder ID still comes from the Drive folder URL.
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

                <form
                  className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_120px_auto] dark:border-slate-700"
                  onSubmit={handleDriveImport}
                >
                  <input
                    className={inputStyles}
                    placeholder="Google Drive Folder ID"
                    value={driveForm.folderId}
                    onChange={(event) => setDriveForm((previous) => ({ ...previous, folderId: event.target.value }))}
                    required
                    disabled={importDisabled}
                  />
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
                    {importingDrive ? 'Importing...' : 'Import Drive Folder'}
                  </button>
                </form>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                  Folder ID example: from `https://drive.google.com/drive/folders/abc123`, use `abc123`.
                </div>
              </div>
            </GalleryPanelCard>

            <GalleryPanelCard title="Duplicate handling" description="Google Drive imports skip duplicates automatically before new records are created.">
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Duplicates are matched by Google Drive source ID inside the selected album. Preview: importing up to{' '}
                {Number(driveForm.limit) || 50} items from folder {folderPreview}.
              </p>
            </GalleryPanelCard>

            {importSummary ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">Last import summary</p>
                <p className="mt-1 text-emerald-900/80 dark:text-emerald-100/80">
                  Imported: {importSummary.importedCount} | Duplicates skipped: {importSummary.skippedCount}
                </p>
                {Array.isArray(importSummary.skipped) && importSummary.skipped.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {importSummary.skipped.map((item, index) => (
                      <div
                        key={`${item.sourceId}-${index}`}
                        className="rounded-lg border border-emerald-300/70 bg-white/70 px-3 py-2 text-xs text-emerald-950 dark:border-emerald-800/60 dark:bg-slate-900/40 dark:text-emerald-100"
                      >
                        <p className="font-semibold">{item.caption || item.sourceId}</p>
                        <p className="mt-1 opacity-80">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <GalleryPanelCard title="Select an album" description="Choose a destination album before importing media.">
            <p className="text-sm text-slate-500 dark:text-slate-400">Import tools stay hidden until a destination album is selected.</p>
          </GalleryPanelCard>
        )}
      </div>
    </div>
  );
}

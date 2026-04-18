'use client';

import {
  GalleryAlbumPicker,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  inputStyles,
} from './galleryAdminShared';

export default function GalleryImportPanel({ controller, embedded = false }) {
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
              <form className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4 dark:border-slate-700" onSubmit={handleDriveImport}>
                <input
                  className={inputStyles}
                  placeholder="Google Drive Folder ID"
                  value={driveForm.folderId}
                  onChange={(event) => setDriveForm((previous) => ({ ...previous, folderId: event.target.value }))}
                  required
                />
                <input
                  className={inputStyles}
                  placeholder="OAuth Access Token"
                  value={driveForm.accessToken}
                  onChange={(event) => setDriveForm((previous) => ({ ...previous, accessToken: event.target.value }))}
                  required
                />
                <input
                  className={inputStyles}
                  type="number"
                  min={1}
                  max={200}
                  value={driveForm.limit}
                  onChange={(event) => setDriveForm((previous) => ({ ...previous, limit: event.target.value }))}
                />
                <button className={buttonStyles} disabled={importingDrive}>
                  {importingDrive ? 'Importing...' : 'Import Drive Folder'}
                </button>
              </form>
            </GalleryPanelCard>

            <GalleryPanelCard title="Duplicate handling" description="Google Drive imports now skip duplicates automatically before new records are created.">
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Duplicates are matched by Google Drive source ID inside the selected album. Preview: importing up to {Number(driveForm.limit) || 50} items from folder {driveForm.folderId || '...'}.
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

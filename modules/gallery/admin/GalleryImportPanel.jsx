'use client';

import {
  GalleryAlbumPicker,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  inputStyles,
} from './galleryAdminShared';

export default function GalleryImportPanel({ controller }) {
  const {
    albums,
    selectedAlbum,
    selectedAlbumId,
    loadingAlbums,
    driveForm,
    setDriveForm,
    duplicateMode,
    setDuplicateMode,
    importingDrive,
    importSummary,
    handleDriveImport,
    setSelectedAlbumId,
  } = controller;

  return (
    <div className="space-y-6">
      <GalleryPageHeader
        eyebrow="Import Workflow"
        title="Import"
        description="Import Google Drive media into a selected album with duplicate-aware handling and a focused workflow."
      />

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

            <GalleryPanelCard title="Duplicate handling" description="Choose how duplicate source IDs and URLs should be handled.">
              <div className="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-200">
                <label className="flex items-center gap-2">
                  <input type="radio" name="duplicateMode" checked={duplicateMode === 'keep'} onChange={() => setDuplicateMode('keep')} />
                  Keep all imported media
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="duplicateMode" checked={duplicateMode === 'skip'} onChange={() => setDuplicateMode('skip')} />
                  Skip duplicates by source ID / URL
                </label>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Preview: importing up to {Number(driveForm.limit) || 50} items from folder {driveForm.folderId || '...'}.
              </p>
            </GalleryPanelCard>

            {importSummary ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="font-semibold text-emerald-900 dark:text-emerald-100">Last import summary</p>
                <p className="mt-1 text-emerald-900/80 dark:text-emerald-100/80">
                  Imported: {importSummary.importedCount} | Kept: {importSummary.keptCount} | Duplicates removed: {importSummary.duplicateRemoved}
                </p>
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

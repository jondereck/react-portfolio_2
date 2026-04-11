'use client';

import SortableMediaGrid from '@/app/admin/gallery/components/SortableMediaGrid';
import { GalleryAlbumPicker, GalleryEmptyState, GalleryPageHeader, GalleryPanelCard, buttonStyles, ghostButtonStyles } from './galleryAdminShared';

export default function GalleryArrangePanel({ controller }) {
  const {
    albums,
    selectedAlbum,
    selectedAlbumId,
    arrangePhotos,
    loadingAlbums,
    loadingPhotos,
    sortMode,
    setSortMode,
    orderDirty,
    orderSaving,
    arrangeDragState,
    selectedPhotoIds,
    setSelectedAlbumId,
    deletePhoto,
    setCoverPhoto,
    reorderChange,
    togglePhotoSelect,
    moveSelection,
    undoOrder,
    saveOrder,
    handleDragStateChange,
    loadPhotos,
    getPhotoSortTime,
  } = controller;

  const isDragging = Boolean(arrangeDragState.isDragging);

  return (
    <div className="space-y-6">
      <GalleryPageHeader
        eyebrow="Sorting Workspace"
        title="Arrange"
        description="A dedicated ordering workspace for the selected album with drag-and-drop controls only."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <GalleryAlbumPicker
          albums={albums}
          selectedAlbumId={selectedAlbumId}
          loadingAlbums={loadingAlbums}
          onSelectAlbum={setSelectedAlbumId}
          emptyDescription="Create an album before you can reorder its media."
        />

        {selectedAlbum ? (
          <GalleryPanelCard
            title={`Arrange ${selectedAlbum.name}`}
            description="Use manual sorting, selection, and save controls without upload or settings clutter."
          >
            {isDragging ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/95 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200">
                Dragging {arrangeDragState.draggingCount > 1 ? `${arrangeDragState.draggingCount} selected items` : '1 item'}. Release to drop.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white/95 p-3 dark:border-slate-700 dark:bg-slate-900/95">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Shift-click supports range selection.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={ghostButtonStyles}
                    onClick={async () => {
                      if (sortMode !== 'custom') {
                        setSortMode('custom');
                      }
                      await loadPhotos(selectedAlbumId, 'custom');
                    }}
                  >
                    Manual order
                  </button>
                  <button
                    type="button"
                    className={ghostButtonStyles}
                    onClick={() => reorderChange([...arrangePhotos].sort((a, b) => getPhotoSortTime(b) - getPhotoSortTime(a)))}
                  >
                    Sort by newest
                  </button>
                  <button
                    type="button"
                    className={ghostButtonStyles}
                    onClick={() => reorderChange([...arrangePhotos].sort((a, b) => getPhotoSortTime(a) - getPhotoSortTime(b)))}
                  >
                    Sort by oldest
                  </button>
                  <button type="button" className={ghostButtonStyles} onClick={() => reorderChange([...arrangePhotos].reverse())}>
                    Reverse order
                  </button>
                  <button type="button" className={ghostButtonStyles} onClick={() => moveSelection('top')}>
                    Move to top
                  </button>
                  <button type="button" className={ghostButtonStyles} onClick={() => moveSelection('bottom')}>
                    Move to bottom
                  </button>
                  <button type="button" className={ghostButtonStyles} onClick={undoOrder}>
                    Undo
                  </button>
                  <button type="button" className={buttonStyles} disabled={!orderDirty || orderSaving} onClick={saveOrder}>
                    {orderSaving ? 'Saving order...' : 'Save order'}
                  </button>
                </div>
              </div>
            )}

            {loadingPhotos ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading media...</p>
            ) : arrangePhotos.length === 0 ? (
              <GalleryEmptyState
                title="No media to arrange"
                description="Use the Media page first, then return here to manually sequence the album."
              />
            ) : (
              <SortableMediaGrid
                items={arrangePhotos}
                selectedIds={selectedPhotoIds}
                coverPhotoId={selectedAlbum.coverPhotoId}
                onItemsChange={reorderChange}
                onToggleSelect={togglePhotoSelect}
                onDelete={deletePhoto}
                onSetCover={setCoverPhoto}
                onDragStateChange={handleDragStateChange}
              />
            )}
          </GalleryPanelCard>
        ) : (
          <GalleryPanelCard title="Select an album" description="Choose an album before opening the arrange workspace.">
            <GalleryEmptyState title="No album selected" description="The arrange tools stay hidden until you choose an album." />
          </GalleryPanelCard>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ConfirmModal';
import SortableMediaGrid from '@/app/admin/gallery/components/SortableMediaGrid';
import GalleryArrangeMobileControls from '@/modules/gallery/admin/GalleryArrangeMobileControls';
import GalleryMediaViewer from './GalleryMediaViewer';
import {
  GalleryAlbumPicker,
  GalleryEmptyState,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  ghostButtonStyles,
} from './galleryAdminShared';

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
    deleteSelectedPhotos,
    clearPhotoSelection,
    setSelectedAlbumId,
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
  const selectedCount = selectedPhotoIds.length;
  const showSelectionBar = selectedCount > 0;
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete ${selectedCount} selected media item${selectedCount === 1 ? '' : 's'}?`}
        description="This action cannot be undone."
        confirmLabel={selectedCount === 1 ? 'Delete item' : `Delete ${selectedCount} items`}
        loading={confirmingDelete}
        destructive
        onConfirm={async () => {
          try {
            setConfirmingDelete(true);
            await deleteSelectedPhotos({ skipConfirm: true });
            setConfirmDeleteOpen(false);
          } finally {
            setConfirmingDelete(false);
          }
        }}
      />

      <GalleryPageHeader
        eyebrow="Sorting Workspace"
        title="Arrange"
        description="A dedicated ordering workspace for the selected album with selection, reordering, and save controls only."
      />

      <div className="space-y-6">
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
            description="Use manual sorting, selection, and save controls without upload, delete, or settings clutter."
            className={`relative overflow-visible ${showSelectionBar ? 'pb-32 md:pb-16' : 'pb-24 md:pb-0'}`}
          >
            {isDragging ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/95 px-3 py-2 text-xs font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200">
                Dragging {arrangeDragState.draggingCount > 1 ? `${arrangeDragState.draggingCount} selected items` : '1 item'}. Release to drop.
              </div>
            ) : (
              <div className="hidden rounded-xl border border-slate-200 bg-white/95 p-3 dark:border-slate-700 dark:bg-slate-900/95 md:block">
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

            {!showSelectionBar ? (
            <div className="md:hidden">
              <GalleryArrangeMobileControls
                orderDirty={orderDirty}
                orderSaving={orderSaving}
                onSaveOrder={saveOrder}
                onManualOrder={async () => {
                  if (sortMode !== 'custom') {
                    setSortMode('custom');
                  }
                  await loadPhotos(selectedAlbumId, 'custom');
                }}
                onSortNewest={() => reorderChange([...arrangePhotos].sort((a, b) => getPhotoSortTime(b) - getPhotoSortTime(a)))}
                onSortOldest={() => reorderChange([...arrangePhotos].sort((a, b) => getPhotoSortTime(a) - getPhotoSortTime(b)))}
                onReverseOrder={() => reorderChange([...arrangePhotos].reverse())}
                onMoveTop={() => moveSelection('top')}
                onMoveBottom={() => moveSelection('bottom')}
                onUndo={undoOrder}
              />
            </div>
            ) : null}

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
              onSetCover={setCoverPhoto}
              onPreview={setPreviewPhoto}
              onDragStateChange={handleDragStateChange}
            />
          )}

          <GalleryMediaViewer
            open={Boolean(previewPhoto)}
            photo={previewPhoto}
            onClose={() => setPreviewPhoto(null)}
          />

          {showSelectionBar ? (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-10px_30px_-18px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
              <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedCount} media item{selectedCount === 1 ? '' : 's'} selected
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use delete to remove all checked items at once.
                  </p>
                </div>
                <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap">
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-12 flex-1 sm:h-10 sm:flex-none"
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={confirmingDelete}
                  >
                    <Trash2 className="size-4" />
                    Delete selected
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 sm:h-10 sm:flex-none"
                    onClick={clearPhotoSelection}
                  >
                    <X className="size-4" />
                    Clear selection
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
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

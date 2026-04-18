'use client';

import { useState } from 'react';
import { ArrowRightLeft, Image, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ConfirmModal';
import SortableMediaGrid from '@/app/admin/gallery/components/SortableMediaGrid';
import GalleryArrangeMobileControls from '@/modules/gallery/admin/GalleryArrangeMobileControls';
import GalleryMediaViewer from './GalleryMediaViewer';
import GalleryCreateAlbumModal from './GalleryCreateAlbumModal';
import {
  GalleryAlbumPicker,
  GalleryEmptyState,
  GalleryPageHeader,
  GalleryPanelCard,
  buttonStyles,
  ghostButtonStyles,
} from './galleryAdminShared';

export default function GalleryArrangePanel({ controller, embedded = false }) {
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
    moveSelectedPhotos,
    moveTargetAlbumId,
    setMoveTargetAlbumId,
    movingPhotos,
    savingAlbum,
    setSelectedAlbumId,
    setCoverPhoto,
    createAlbumRecord,
    loadAlbums,
    reorderChange,
    togglePhotoSelect,
    selectPhotoRange,
    moveSelection,
    undoOrder,
    saveOrder,
    handleDragStateChange,
    loadPhotos,
    getPhotoSortTime,
  } = controller;

  const isDragging = Boolean(arrangeDragState.isDragging);
  const selectedCount = selectedPhotoIds.length;
  const showSelectionBar = selectedCount > 0 && !isDragging;
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);

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

      <GalleryCreateAlbumModal
        open={createAlbumOpen}
        onOpenChange={setCreateAlbumOpen}
        loading={savingAlbum}
        title="Create album for move"
        description="Create a destination album without leaving the arrange flow. The new album will be selected as the move target."
        confirmLabel="Create album"
        onCreate={async (albumData) => {
          const created = await createAlbumRecord(albumData);
          if (!created) {
            return null;
          }

          await loadAlbums();
          setMoveTargetAlbumId(created.id);
          return created;
        }}
      />

      {!embedded ? (
        <GalleryPageHeader
          eyebrow="Sorting Workspace"
          title="Arrange"
          description="A dedicated ordering workspace for the selected album with selection, reordering, and save controls only."
        />
      ) : null}

      <div className="space-y-6">
        <GalleryAlbumPicker
          albums={albums}
          selectedAlbumId={selectedAlbumId}
          loadingAlbums={loadingAlbums}
          onSelectAlbum={setSelectedAlbumId}
          emptyDescription="Create an album before you can reorder its media."
          onCreateAlbumClick={() => setCreateAlbumOpen(true)}
        />

        {selectedAlbum ? (
          <GalleryPanelCard
            title={`Arrange ${selectedAlbum.name}`}
            description=""
            className={`relative overflow-visible ${showSelectionBar ? 'pb-32 md:pb-16' : 'pb-24 md:pb-0'}`}
          >
            {!isDragging ? (
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
            ) : null}

            {!showSelectionBar && !isDragging ? (
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
                onSelectRange={(photoId, options) => selectPhotoRange(photoId, arrangePhotos.map((photo) => photo.id), options)}
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
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-10px_30px_-18px_rgba(15,23,42,0.4)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-4">
              <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-5">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                    <Image className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">
                      {selectedCount} media item{selectedCount === 1 ? '' : 's'} selected
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                      Use delete or move to apply a bulk action to the selected items.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Add to album</p>
                  <div className="grid items-end gap-3">
                    <select
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
                      value={moveTargetAlbumId ?? ''}
                      onChange={(event) => setMoveTargetAlbumId(Number(event.target.value) || null)}
                      disabled={movingPhotos || albums.filter((album) => album.id !== selectedAlbumId).length === 0}
                    >
                      <option value="">Move to album</option>
                      {albums
                        .filter((album) => album.id !== selectedAlbumId)
                        .map((album) => (
                          <option key={album.id} value={album.id}>
                            {album.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-16 flex-col rounded-xl px-2 text-xs leading-tight"
                      onClick={() => moveSelectedPhotos()}
                      disabled={
                        movingPhotos ||
                        !moveTargetAlbumId ||
                        moveTargetAlbumId === selectedAlbumId ||
                        albums.filter((album) => album.id !== selectedAlbumId).length === 0
                      }
                    >
                      <ArrowRightLeft className="size-4" />
                      <span>{movingPhotos ? 'Moving...' : 'Move'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-16 flex-col rounded-xl border-blue-200 px-2 text-xs leading-tight text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-950/40"
                      onClick={() => setCreateAlbumOpen(true)}
                    >
                      <Plus className="size-4" />
                      <span>Create album</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-16 flex-col rounded-xl px-2 text-xs leading-tight"
                      onClick={() => setConfirmDeleteOpen(true)}
                      disabled={confirmingDelete || movingPhotos}
                    >
                      <Trash2 className="size-4" />
                      <span>Delete</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-16 flex-col rounded-xl px-2 text-xs leading-tight"
                      onClick={clearPhotoSelection}
                      disabled={movingPhotos}
                    >
                      <X className="size-4" />
                      <span>Clear</span>
                    </Button>
                  </div>
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

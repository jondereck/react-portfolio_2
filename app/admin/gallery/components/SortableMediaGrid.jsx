'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import MediaPreview from './MediaPreview';

function SortableMediaCard({
  photo,
  index,
  isSelected,
  isCover,
  isDragging,
  isDropTarget,
  onToggleSelect,
  onDelete,
  onSetCover,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCardClick = (event) => {
    if (isDragging) return;
    const target = event.target;
    if (target instanceof Element && target.closest('button,input,label,a,video')) {
      return;
    }
    onToggleSelect(photo.id, { shiftKey: event.shiftKey });
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={`relative overflow-hidden rounded-lg border bg-white p-2 shadow-sm transition dark:bg-slate-900 ${
        isDragging
          ? 'z-30 border-slate-900 shadow-xl ring-2 ring-slate-300 dark:border-slate-100 dark:ring-slate-700'
          : isDropTarget
            ? 'border-blue-500 ring-2 ring-blue-200 dark:border-blue-400 dark:ring-blue-900/40'
            : isSelected
              ? 'border-blue-500 ring-2 ring-blue-200 dark:border-blue-400 dark:ring-blue-900/40'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
      }`}
    >
      {isDropTarget ? (
        <span className="pointer-events-none absolute inset-x-3 top-2 h-1 rounded bg-blue-500/80" aria-hidden />
      ) : null}

      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isSelected}
            onChange={(event) => onToggleSelect(photo.id, { shiftKey: event.shiftKey })}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select media ${index + 1}`}
          />
          Select
        </label>

        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          #{index + 1}
        </span>
      </div>

      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="mb-2 aspect-[4/3] cursor-grab overflow-hidden rounded-md border border-slate-200 bg-slate-100 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800"
      >
        <MediaPreview
          url={photo.imageUrl}
          alt={photo.caption || `Media ${photo.id}`}
          className="h-full w-full bg-slate-100 object-contain dark:bg-slate-800"
          controls={false}
        />
      </div>

      <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
        {photo.caption || 'Untitled media'}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">{photo.sourceType}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isCover ? (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Cover
            </span>
          ) : null}
          <button
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
            onClick={(event) => {
              event.stopPropagation();
              onSetCover(photo.id);
            }}
          >
            Set Cover
          </button>
          <button
            type="button"
            className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(photo.id);
            }}
          >
            Delete
          </button>
        </div>

      
      </div>
    </article>
  );
}

function OverlayCard({ photo, draggingCount }) {
  if (!photo) return null;
  return (
    <article className="relative w-[240px] overflow-hidden rounded-lg border border-slate-300 bg-white p-2 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
      {draggingCount > 1 ? (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
          {draggingCount}
        </span>
      ) : null}
      <div className="mb-2 aspect-[4/3] overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
        <MediaPreview
          url={photo.imageUrl}
          alt={photo.caption || `Media ${photo.id}`}
          className="h-full w-full bg-slate-100 object-contain dark:bg-slate-800"
          controls={false}
        />
      </div>
      <p className="truncate text-xs font-medium">{photo.caption || 'Untitled media'}</p>
    </article>
  );
}

function moveSelectedBlock(items, draggedIds, overId) {
  if (!overId || draggedIds.length === 0) return items;

  const draggedSet = new Set(draggedIds);
  if (draggedSet.has(overId)) return items;

  const movingItems = items.filter((item) => draggedSet.has(item.id));
  if (movingItems.length === 0) return items;

  const remainingItems = items.filter((item) => !draggedSet.has(item.id));
  const insertIndex = remainingItems.findIndex((item) => item.id === overId);
  if (insertIndex === -1) return items;

  const nextItems = [...remainingItems];
  nextItems.splice(insertIndex, 0, ...movingItems);
  return nextItems;
}

export default function SortableMediaGrid({
  items,
  selectedIds,
  coverPhotoId,
  onItemsChange,
  onToggleSelect,
  onDelete,
  onSetCover,
  onDragStateChange,
}) {
  const [activeId, setActiveId] = useState(null);
  const [draggedIds, setDraggedIds] = useState([]);
  const [overId, setOverId] = useState(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
  );

  const activePhoto = useMemo(
    () => items.find((photo) => photo.id === activeId) ?? null,
    [items, activeId],
  );

  const handleDragStart = ({ active }) => {
    const activePhotoId = active.id;
    const dragIds = selectedSet.has(activePhotoId)
      ? items.filter((item) => selectedSet.has(item.id)).map((item) => item.id)
      : [activePhotoId];

    setDraggedIds(dragIds);
    setActiveId(active.id);
    setOverId(active.id);
    onDragStateChange?.({ isDragging: true, draggingCount: dragIds.length });
  };

  const handleDragOver = ({ over }) => {
    setOverId(over?.id ?? null);
  };

  const handleDragEnd = ({ active, over }) => {
    const nextOverId = over?.id ?? null;

    if (nextOverId) {
      if (draggedIds.length > 1) {
        const nextItems = moveSelectedBlock(items, draggedIds, nextOverId);
        const changed = nextItems.some((item, index) => item.id !== items[index]?.id);
        if (changed) {
          onItemsChange(nextItems);
        }
      } else if (active.id !== nextOverId) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === nextOverId);
        if (oldIndex !== -1 && newIndex !== -1) {
          onItemsChange(arrayMove(items, oldIndex, newIndex));
        }
      }
    }

    setActiveId(null);
    setDraggedIds([]);
    setOverId(null);
    onDragStateChange?.({ isDragging: false, draggingCount: 0 });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDraggedIds([]);
    setOverId(null);
    onDragStateChange?.({ isDragging: false, draggingCount: 0 });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {items.map((photo, index) => (
            <SortableMediaCard
              key={photo.id}
              photo={photo}
              index={index}
              isSelected={selectedSet.has(photo.id)}
              isCover={coverPhotoId === photo.id}
              isDragging={draggedIds.includes(photo.id)}
              isDropTarget={overId === photo.id && !draggedIds.includes(photo.id)}
              onToggleSelect={onToggleSelect}
              onDelete={onDelete}
              onSetCover={onSetCover}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        <OverlayCard photo={activePhoto} draggingCount={draggedIds.length} />
      </DragOverlay>
    </DndContext>
  );
}

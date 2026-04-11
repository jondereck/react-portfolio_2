'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
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

const SortableMediaCard = memo(function SortableMediaCard({
  photo,
  index,
  isSelected,
  isCover,
  isDragging,
  isDropTarget,
  dragActive,
  onToggleSelect,
  onSetCover,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
  } = useSortable({
    id: photo.id,
    transition: {
      duration: 180,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
  });

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
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-[transform,opacity,box-shadow,border-color,background-color] duration-150 will-change-transform dark:bg-slate-900 ${
        isDragging
          ? 'z-20 scale-[0.985] border-slate-400/80 opacity-45 shadow-none ring-2 ring-slate-300/80 dark:border-slate-500 dark:ring-slate-700/70'
          : isDropTarget
            ? 'border-blue-500 bg-blue-50/90 ring-2 ring-blue-300 shadow-md dark:border-blue-400 dark:bg-blue-950/25 dark:ring-blue-700/70'
            : isSelected
              ? 'border-blue-500 ring-2 ring-blue-200 dark:border-blue-400 dark:ring-blue-900/40'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
      } ${dragActive ? 'border-dashed dark:border-dashed' : ''}`}
    >
      {dragActive ? (
        <span
          className={`pointer-events-none absolute inset-0 transition ${
            isDropTarget
              ? 'bg-blue-500/8'
              : 'bg-transparent'
          }`}
          aria-hidden
        />
      ) : null}
      {isDropTarget ? (
        <>
          <span className="pointer-events-none absolute inset-x-3 top-2 h-1 rounded bg-blue-500/90" aria-hidden />
          <span className="pointer-events-none absolute inset-y-3 left-2 w-1 rounded bg-blue-500/80" aria-hidden />
        </>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-2.5 py-2 dark:border-slate-700/80 md:px-3 md:py-3">
        <label className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 md:text-xs">
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

        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 md:text-[11px]">
          #{index + 1}
        </span>
      </div>

      <div className="grid gap-2 p-2.5 md:gap-3 md:p-3">
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="aspect-[16/9] cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-slate-100 active:cursor-grabbing touch-none dark:border-slate-700 dark:bg-slate-800 md:aspect-[4/3]"
        >
          <MediaPreview
            url={photo.imageUrl}
            alt={photo.caption || `Media ${photo.id}`}
            className="h-full w-full bg-slate-100 object-contain dark:bg-slate-800"
            controls={false}
          />
        </div>

        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {photo.caption || 'Untitled media'}
          </p>
          <p className="hidden text-[11px] leading-5 text-slate-500 dark:text-slate-400 md:block">{photo.sourceType}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {isCover ? (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                Cover
              </span>
            ) : null}
          </div>

          {onSetCover ? (
            <button
              type="button"
              className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={(event) => {
                event.stopPropagation();
                onSetCover(photo.id);
              }}
            >
              Set cover
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}, (prevProps, nextProps) => (
  prevProps.photo === nextProps.photo &&
  prevProps.index === nextProps.index &&
  prevProps.isSelected === nextProps.isSelected &&
  prevProps.isCover === nextProps.isCover &&
  prevProps.isDragging === nextProps.isDragging &&
  prevProps.isDropTarget === nextProps.isDropTarget &&
  prevProps.dragActive === nextProps.dragActive &&
  prevProps.onToggleSelect === nextProps.onToggleSelect &&
  prevProps.onSetCover === nextProps.onSetCover
));

const OverlayCard = memo(function OverlayCard({ photo, draggingCount }) {
  if (!photo) return null;
  return (
    <article className="relative w-[200px] scale-[1.02] overflow-hidden rounded-xl border border-slate-300/90 bg-white/95 p-2 shadow-[0_20px_60px_-22px_rgba(15,23,42,0.6)] backdrop-blur dark:border-slate-500 dark:bg-slate-900/95 sm:w-[240px]">
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
});

function areItemOrdersEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index]?.id !== right[index]?.id) return false;
  }
  return true;
}

function moveSingleItem(items, activeId, overId) {
  if (!overId || activeId === overId) return items;
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return items;
  return arrayMove(items, oldIndex, newIndex);
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
  onSetCover,
  onDragStateChange,
}) {
  const [activeId, setActiveId] = useState(null);
  const [draggedIds, setDraggedIds] = useState([]);
  const [overId, setOverId] = useState(null);
  const [previewItems, setPreviewItems] = useState(items);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const draggedSet = useMemo(() => new Set(draggedIds), [draggedIds]);
  const dragActive = activeId !== null;
  const visibleItems = dragActive ? previewItems : items;
  const sortableIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);

  useEffect(() => {
    if (!dragActive) {
      setPreviewItems(items);
    }
  }, [items, dragActive]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 80, tolerance: 4 },
    }),
  );

  const activePhoto = useMemo(
    () => visibleItems.find((photo) => photo.id === activeId) ?? items.find((photo) => photo.id === activeId) ?? null,
    [visibleItems, items, activeId],
  );

  const handleDragStart = ({ active }) => {
    const activePhotoId = active.id;
    const dragIds = selectedSet.has(activePhotoId)
      ? items.filter((item) => selectedSet.has(item.id)).map((item) => item.id)
      : [activePhotoId];

    setDraggedIds(dragIds);
    setActiveId(active.id);
    setOverId(active.id);
    setPreviewItems(items);
    onDragStateChange?.({ isDragging: true, draggingCount: dragIds.length });
  };

  const handleDragOver = ({ active, over }) => {
    const nextOverId = over?.id ?? null;
    if (!nextOverId) return;

    setOverId(nextOverId);
    setPreviewItems((previous) => {
      const nextItems = draggedIds.length > 1
        ? moveSelectedBlock(previous, draggedIds, nextOverId)
        : moveSingleItem(previous, active.id, nextOverId);

      return areItemOrdersEqual(previous, nextItems) ? previous : nextItems;
    });
  };

  const handleDragEnd = ({ over }) => {
    const nextOverId = over?.id ?? null;

    if (nextOverId && !areItemOrdersEqual(previewItems, items)) {
      onItemsChange(previewItems);
    }

    setActiveId(null);
    setDraggedIds([]);
    setOverId(null);
    setPreviewItems(items);
    onDragStateChange?.({ isDragging: false, draggingCount: 0 });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDraggedIds([]);
    setOverId(null);
    setPreviewItems(items);
    onDragStateChange?.({ isDragging: false, draggingCount: 0 });
  };

  const dropAnimation = {
    duration: 190,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.45',
        },
      },
    }),
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
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div
          className={`relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${
            dragActive ? 'rounded-xl bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:20px_20px] p-3' : ''
          }`}
        >
          {visibleItems.map((photo, index) => (
            <SortableMediaCard
              key={photo.id}
              photo={photo}
              index={index}
              isSelected={selectedSet.has(photo.id)}
              isCover={coverPhotoId === photo.id}
              isDragging={draggedSet.has(photo.id)}
              isDropTarget={overId === photo.id && !draggedSet.has(photo.id)}
              dragActive={dragActive}
              onToggleSelect={onToggleSelect}
              onSetCover={onSetCover}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={dropAnimation}>
        <OverlayCard photo={activePhoto} draggingCount={draggedIds.length} />
      </DragOverlay>
    </DndContext>
  );
}

'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
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
import { GripVertical, Move, ScanLine } from 'lucide-react';
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
  onSelectRange,
  touchSelectStateRef,
  suppressNextClickRef,
  onSetCover,
  onPreview,
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
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
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
      data-photo-id={photo.id}
      onClick={handleCardClick}
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch' || isDragging) return;
        const target = event.target;
        if (target instanceof Element && target.closest('button,input,label,a,video,[data-drag-handle]')) {
          return;
        }
        suppressNextClickRef.current = true;
        onSelectRange?.(photo.id, { resetAnchor: true });
        touchSelectStateRef.current = { active: true, lastPhotoId: photo.id };
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'touch' || !touchSelectStateRef.current.active) return;
        const target = event.target instanceof Element ? event.target.closest('[data-photo-id]') : null;
        const nextPhotoId = target?.getAttribute('data-photo-id');
        if (!nextPhotoId || nextPhotoId === touchSelectStateRef.current.lastPhotoId) return;
        touchSelectStateRef.current.lastPhotoId = nextPhotoId;
        onSelectRange?.(Number(nextPhotoId));
      }}
      onPointerUp={() => {
        touchSelectStateRef.current = { active: false, lastPhotoId: null };
      }}
      onPointerCancel={() => {
        touchSelectStateRef.current = { active: false, lastPhotoId: null };
        suppressNextClickRef.current = false;
      }}
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-[transform,opacity,box-shadow,border-color,background-color] duration-200 will-change-transform dark:bg-slate-900 ${
        isDragging
          ? 'z-20 scale-[0.97] border-slate-400/80 opacity-20 shadow-none ring-2 ring-slate-300/80 dark:border-slate-500 dark:ring-slate-700/70'
          : isDropTarget
            ? 'scale-[1.01] border-blue-500 bg-blue-50/90 shadow-[0_18px_40px_-24px_rgba(37,99,235,0.7)] ring-2 ring-blue-300 dark:border-blue-400 dark:bg-blue-950/25 dark:ring-blue-700/70'
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
          <span className="pointer-events-none absolute inset-x-3 bottom-2 h-1 rounded bg-blue-500/90" aria-hidden />
          <span className="pointer-events-none absolute inset-y-3 left-2 w-1 rounded bg-blue-500/80" aria-hidden />
          <span className="pointer-events-none absolute inset-y-3 right-2 w-1 rounded bg-blue-500/80" aria-hidden />
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-blue-400/80" aria-hidden />
        </>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5 dark:border-slate-700/80 md:px-3 md:py-3">
        <label
          className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-600 touch-manipulation dark:text-slate-300 md:text-xs"
          onClick={(event) => event.stopPropagation()}
        >
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

      <div className="grid gap-3 p-3 md:gap-3 md:p-3">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 md:aspect-[4/3]">
          <button
            type="button"
            className="block h-full w-full touch-manipulation"
            onClick={(event) => {
              event.stopPropagation();
              onPreview?.(photo);
            }}
            aria-label={`View ${photo.caption || `media ${photo.id}`}`}
          >
            <MediaPreview
              url={photo.imageUrl}
              sourceType={photo.sourceType}
              sourceId={photo.sourceId}
              alt={photo.caption || `Media ${photo.id}`}
              className="h-full w-full bg-slate-100 object-contain dark:bg-slate-800"
              controls={false}
            />
          </button>

          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            className={`absolute bottom-2 right-2 inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold shadow-sm transition active:scale-[0.97] touch-none select-none md:min-h-9 md:min-w-9 md:px-2.5 md:py-1.5 md:text-[11px] ${
              isDropTarget || dragActive
                ? 'border-blue-300 bg-white/95 text-blue-700 backdrop-blur dark:border-blue-700 dark:bg-slate-950/90 dark:text-blue-200'
                : 'border-slate-300 bg-white/92 text-slate-700 backdrop-blur hover:bg-white dark:border-slate-600 dark:bg-slate-950/88 dark:text-slate-200 dark:hover:bg-slate-950'
            }`}
            onClick={(event) => event.stopPropagation()}
            style={{ touchAction: 'none' }}
            aria-label={`Drag to reorder ${photo.caption || `media ${photo.id}`}`}
          >
            <GripVertical className="h-3.5 w-3.5" />
            <span className="md:hidden">Drag</span>
          </button>
        </div>

        {isCover ? (
          <div className="flex justify-center">
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Cover
            </span>
          </div>
        ) : null}

        {onSetCover ? (
          <div className="flex justify-center">
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
          </div>
        ) : null}
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
  prevProps.onSetCover === nextProps.onSetCover &&
  prevProps.onPreview === nextProps.onPreview
));

const OverlayCard = memo(function OverlayCard({ photo, draggingCount }) {
  if (!photo) return null;
  return (
    <article className="relative w-[220px] scale-[1.04] overflow-hidden rounded-2xl border border-slate-300/90 bg-white/96 p-2.5 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.75)] backdrop-blur dark:border-slate-500 dark:bg-slate-900/95 sm:w-[250px]">
      {draggingCount > 1 ? (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white">
          {draggingCount}
        </span>
      ) : null}
      <div className="mb-2 aspect-[4/3] overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
        <MediaPreview
          url={photo.imageUrl}
          sourceType={photo.sourceType}
          sourceId={photo.sourceId}
          alt={photo.caption || `Media ${photo.id}`}
          className="h-full w-full bg-slate-100 object-contain dark:bg-slate-800"
          controls={false}
        />
      </div>
      <p className="truncate text-xs font-medium">{photo.caption || 'Untitled media'}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <Move className="h-3 w-3" />
        Drop into the blue guide
      </div>
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

function getPointFromEvent(event) {
  if (!event) return null;

  if ('touches' in event) {
    const touch = event.touches?.[0] ?? event.changedTouches?.[0];
    if (touch) {
      return { x: touch.clientX, y: touch.clientY };
    }
  }

  if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return { x: event.clientX, y: event.clientY };
  }

  return null;
}

export default function SortableMediaGrid({
  items,
  selectedIds,
  coverPhotoId,
  onItemsChange,
  onToggleSelect,
  onSelectRange,
  onSetCover,
  onPreview,
  onDragStateChange,
}) {
  const [activeId, setActiveId] = useState(null);
  const [draggedIds, setDraggedIds] = useState([]);
  const [overId, setOverId] = useState(null);
  const [previewItems, setPreviewItems] = useState(items);
  const previewItemsRef = useRef(items);
  const draggedIdsRef = useRef([]);
  const touchSelectStateRef = useRef({ active: false, lastPhotoId: null });
  const suppressNextClickRef = useRef(false);
  const pointerPositionRef = useRef(null);
  const pointerVelocityRef = useRef({ x: 0, y: 0 });
  const lastPointerSampleRef = useRef({ x: 0, y: 0, time: 0 });
  const autoScrollFrameRef = useRef(null);
  const previewCommitFrameRef = useRef(null);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const draggedSet = useMemo(() => new Set(draggedIds), [draggedIds]);
  const dragActive = activeId !== null;
  const visibleItems = dragActive ? previewItems : items;
  const sortableIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);

  useEffect(() => {
    if (!dragActive) {
      previewItemsRef.current = items;
      setPreviewItems(items);
    }
  }, [items, dragActive]);

  useEffect(
    () => () => {
      if (previewCommitFrameRef.current !== null) {
        window.cancelAnimationFrame(previewCommitFrameRef.current);
        previewCommitFrameRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!dragActive || typeof window === 'undefined') {
      return undefined;
    }

    const samplePointer = (clientX, clientY) => {
      const previous = lastPointerSampleRef.current;
      const now = performance.now();
      const elapsed = previous.time > 0 ? Math.max(now - previous.time, 16) : 16;
      const deltaX = clientX - previous.x;
      const deltaY = clientY - previous.y;

      pointerPositionRef.current = { x: clientX, y: clientY };
      pointerVelocityRef.current = {
        x: previous.time > 0 ? (deltaX / elapsed) * 16 : 0,
        y: previous.time > 0 ? (deltaY / elapsed) * 16 : 0,
      };
      lastPointerSampleRef.current = { x: clientX, y: clientY, time: now };
    };

    const handlePointerMove = (event) => {
      samplePointer(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
      const point = getPointFromEvent(event);
      if (point) {
        samplePointer(point.x, point.y);
      }
    };

    const tick = () => {
      const point = pointerPositionRef.current;
      if (point) {
        const viewportHeight = window.innerHeight || 0;
        const edgeZone = Math.max(96, Math.min(180, Math.round(viewportHeight * 0.18)));
        const topDistance = point.y;
        const bottomDistance = viewportHeight - point.y;
        let direction = 0;
        let proximity = 0;

        if (topDistance < edgeZone) {
          direction = -1;
          proximity = 1 - topDistance / edgeZone;
        } else if (bottomDistance < edgeZone) {
          direction = 1;
          proximity = 1 - bottomDistance / edgeZone;
        }

        if (direction !== 0) {
          const velocityBoost = Math.min(1, Math.abs(pointerVelocityRef.current.y) / 22);
          const curvedProximity = proximity * proximity;
          const speed = Math.min(56, 4 + curvedProximity * 40 + velocityBoost * 12);
          window.scrollBy(0, direction * speed);
        }
      }

      autoScrollFrameRef.current = window.requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    autoScrollFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      if (autoScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(autoScrollFrameRef.current);
        autoScrollFrameRef.current = null;
      }
      pointerPositionRef.current = null;
      pointerVelocityRef.current = { x: 0, y: 0 };
      lastPointerSampleRef.current = { x: 0, y: 0, time: 0 };
    };
  }, [dragActive]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 260, tolerance: 8 },
    }),
  );

  const activePhoto = useMemo(
    () => visibleItems.find((photo) => photo.id === activeId) ?? items.find((photo) => photo.id === activeId) ?? null,
    [visibleItems, items, activeId],
  );

  const handleDragStart = ({ active, activatorEvent }) => {
    const activePhotoId = active.id;
    const dragIds = selectedSet.has(activePhotoId)
      ? items.filter((item) => selectedSet.has(item.id)).map((item) => item.id)
      : [activePhotoId];
    draggedIdsRef.current = dragIds;

    const startPoint = getPointFromEvent(activatorEvent);
    if (startPoint) {
      pointerPositionRef.current = startPoint;
      lastPointerSampleRef.current = { x: startPoint.x, y: startPoint.y, time: performance.now() };
      pointerVelocityRef.current = { x: 0, y: 0 };
    }

    setDraggedIds(dragIds);
    setActiveId(active.id);
    setOverId(active.id);
    previewItemsRef.current = items;
    setPreviewItems(items);
    onDragStateChange?.({ isDragging: true, draggingCount: dragIds.length });
  };

  const handleDragOver = ({ active, over }) => {
    const nextOverId = over?.id ?? null;
    if (!nextOverId) return;

    setOverId(nextOverId);

    const previous = previewItemsRef.current;
    const nextItems = draggedIdsRef.current.length > 1
      ? moveSelectedBlock(previous, draggedIdsRef.current, nextOverId)
      : moveSingleItem(previous, active.id, nextOverId);

    if (areItemOrdersEqual(previous, nextItems)) {
      return;
    }

    previewItemsRef.current = nextItems;

    if (previewCommitFrameRef.current !== null) {
      window.cancelAnimationFrame(previewCommitFrameRef.current);
    }

    previewCommitFrameRef.current = window.requestAnimationFrame(() => {
      previewCommitFrameRef.current = null;
      setPreviewItems(nextItems);
    });
  };

  const handleDragEnd = ({ over }) => {
    const nextOverId = over?.id ?? null;

    if (nextOverId && !areItemOrdersEqual(previewItems, items)) {
      onItemsChange(previewItems);
    }

    setActiveId(null);
    setDraggedIds([]);
    draggedIdsRef.current = [];
    setOverId(null);
    previewItemsRef.current = items;
    setPreviewItems(items);
    pointerPositionRef.current = null;
    pointerVelocityRef.current = { x: 0, y: 0 };
    onDragStateChange?.({ isDragging: false, draggingCount: 0 });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDraggedIds([]);
    draggedIdsRef.current = [];
    setOverId(null);
    previewItemsRef.current = items;
    setPreviewItems(items);
    pointerPositionRef.current = null;
    pointerVelocityRef.current = { x: 0, y: 0 };
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
      autoScroll={false}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div
          className={`relative grid grid-cols-2 gap-3 overscroll-y-contain sm:grid-cols-3 md:grid-cols-4 md:gap-2 lg:grid-cols-5 xl:grid-cols-6 ${
            dragActive ? 'rounded-xl bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:20px_20px] p-3' : ''
          }`}
        >
          {dragActive ? (
            <div className="pointer-events-none col-span-full mb-1 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-blue-300/90 bg-white/80 px-3 py-2 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur dark:border-blue-800/70 dark:bg-slate-950/80 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <ScanLine className="h-3.5 w-3.5" />
                Blue guides show the drop target
              </span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-500">|</span>
              <span className="inline-flex items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5" />
                {draggedIds.length > 1 ? 'Move the selected stack together' : 'Drag with the handle for smoother control'}
              </span>
            </div>
          ) : (
            <div className="col-span-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-[11px] font-medium text-slate-600 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-300 md:hidden">
              Hold the Drag button, then move your finger. Select and Set cover stay tappable.
            </div>
          )}
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
              onSelectRange={onSelectRange}
              touchSelectStateRef={touchSelectStateRef}
              suppressNextClickRef={suppressNextClickRef}
              onSetCover={onSetCover}
              onPreview={onPreview}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={dropAnimation} zIndex={70}>
        <OverlayCard photo={activePhoto} draggingCount={draggedIds.length} />
      </DragOverlay>
    </DndContext>
  );
}

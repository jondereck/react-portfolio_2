'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import GalleryUnclothySection from './GalleryUnclothySection';
import { shouldBlurPhoto } from '@/lib/gallery-media';
import { useUnclothyTasksStore } from '@/store/unclothyTasks';

function isVideoMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('video/');
}

export default function GalleryMediaViewer({
  open,
  photo,
  onClose,
  controller,
  album,
  openGenerate = false,
  onGenerateOpened,
  blurUnclothyGenerated = true,
}) {
  const title = photo?.caption || 'Untitled media';
  const canGenerate = Boolean(photo) && !isVideoMime(photo?.mimeType) && Boolean(controller) && Boolean(album);
  const [generateOpen, setGenerateOpen] = useState(false);
  const generateSheetRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const shouldBlurPreview = Boolean(photo) && shouldBlurPhoto(photo, { blurEnabled: blurUnclothyGenerated });
  const queue = useUnclothyTasksStore((state) => state.queue);
  const activeTasks = useUnclothyTasksStore((state) => state.activeTasks);
  const selectedAlbumId = album?.id ?? null;
  const selectedPhotoId = photo?.id ?? null;
  const isRunningForThisPhoto =
    Boolean(selectedAlbumId) &&
    Boolean(selectedPhotoId) &&
    Array.isArray(activeTasks) &&
    activeTasks.some((task) => task?.albumId === selectedAlbumId && task?.sourcePhotoId === selectedPhotoId);
  const isQueuedForThisPhoto =
    Boolean(selectedAlbumId) &&
    Boolean(selectedPhotoId) &&
    Array.isArray(queue) &&
    queue.some((task) => task?.albumId === selectedAlbumId && task?.sourcePhotoId === selectedPhotoId);
  const generatingState = isRunningForThisPhoto ? 'running' : isQueuedForThisPhoto ? 'queued' : null;

  useEffect(() => {
    if (!open) {
      setGenerateOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const handleChange = () => setIsDesktop(mql.matches);
    handleChange();
    try {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    } catch {
      // Safari fallback
      mql.addListener(handleChange);
      return () => mql.removeListener(handleChange);
    }
  }, []);

  useEffect(() => {
    if (!generateOpen) return;
    const el = generateSheetRef.current;
    if (!el) return;
    // Always reset to the top so the header is visible on open.
    requestAnimationFrame(() => {
      try {
        el.scrollTop = 0;
      } catch {
        // ignore
      }
    });
  }, [generateOpen, photo?.id]);

  useEffect(() => {
    if (!open) return;
    if (!openGenerate) return;
    if (!canGenerate) return;
    setGenerateOpen(true);
    onGenerateOpened?.();
  }, [canGenerate, onGenerateOpened, open, openGenerate]);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6">
          <div className="flex min-h-full items-start justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel className="flex max-h-[92dvh] w-full max-w-[min(96vw,1180px)] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="min-w-0">
                    <Dialog.Title className="truncate text-base font-semibold text-slate-950 dark:text-slate-50 sm:text-lg">
                      {title}
                    </Dialog.Title>
                  </div>
                  <div className="hidden flex-wrap items-center gap-2 sm:flex">
                    {canGenerate ? (
                      <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                        onClick={() => setGenerateOpen(true)}
                      >
                        <Sparkles className="size-4" />
                        <span className="ml-2">Generate</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                      onClick={onClose}
                    >
                      <X className="size-4" />
                      <span className="ml-2">Close</span>
                    </button>
                  </div>
                </div>

                <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px]">
                  <section className="relative min-h-0 bg-slate-100 p-3 dark:bg-slate-950 sm:p-4">
                    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
                      <div className="absolute left-4 top-4 z-20 rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                        Preview
                      </div>

                      <div className="relative z-10 flex h-full min-h-0 w-full items-center justify-center px-4 pt-4 pb-16 sm:px-6 sm:pt-6 sm:pb-20">
                        <div
                          className={`relative inline-flex max-w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-xl transition-all duration-500 dark:border-slate-800 dark:bg-slate-950 ${
                            generatingState ? 'scale-[0.988] ring-4 ring-sky-400/30 shadow-[0_0_60px_rgba(56,189,248,0.22)]' : ''
                          }`}
                        >
                          {photo ? (
                            <MediaPreview
                              url={photo.imageUrl}
                              mimeType={photo.mimeType}
                              sourceType={photo.sourceType}
                              sourceId={photo.sourceId}
                              alt={title}
                              className={`mx-auto block max-h-[56dvh] max-w-full object-contain sm:max-h-[62dvh] lg:max-h-[66dvh] ${
                                shouldBlurPreview ? 'blur-md' : ''
                              }`}
                              controls
                            />
                          ) : (
                            <div className="h-[560px] w-[380px] max-w-full rounded-[22px] bg-[radial-gradient(circle_at_top,#cbd5e1,#94a3b8_40%,#334155_100%)] dark:bg-[radial-gradient(circle_at_top,#0f172a,#1f2937_45%,#020617_100%)]" />
                          )}

                          {generatingState ? (
                            <>
                              <div className="absolute inset-0 bg-sky-400/10" />
                              <div className="absolute inset-y-0 left-[-30%] w-[30%] skew-x-[-18deg] animate-[pulse_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                              <div className="absolute bottom-0 left-0 h-1.5 w-[60%] rounded-r-full bg-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.6)]" />
                            </>
                          ) : null}
                        </div>
                      </div>

                      {shouldBlurPreview ? (
                        <div className="pointer-events-none absolute left-4 top-4 z-30 translate-y-10 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                          NSFW
                        </div>
                      ) : null}

                      <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                   
                          {generatingState ? (
                            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 backdrop-blur dark:bg-sky-500/15 dark:text-sky-200">
                              {generatingState === 'running' ? 'Generating…' : 'Queued…'}
                            </span>
                          ) : null}
                        </div>
                  
                      </div>

                      {generateOpen && isDesktop ? (
                        <button
                          type="button"
                          className="absolute inset-0 z-10 hidden cursor-default lg:block"
                          aria-label="Close generate panel"
                          onClick={() => setGenerateOpen(false)}
                        />
                      ) : null}
                    </div>
                  </section>

                  <aside
                    className={`hidden min-h-0 border-l border-slate-200 bg-slate-50 transition-all duration-300 dark:border-slate-800 dark:bg-slate-950/40 lg:block ${
                      generateOpen
                        ? 'translate-x-0 opacity-100'
                        : 'pointer-events-none translate-x-6 opacity-0'
                    }`}
                    aria-hidden={!generateOpen}
                  >
                    <div ref={generateSheetRef} className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                            Generate
                          </p>
                          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">Task settings</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                            Opened from the preview modal. This stays docked on the right instead of covering the image.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          aria-label="Close generate panel"
                          onClick={() => setGenerateOpen(false)}
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <div className="min-h-0 px-5 py-5">
                        <GalleryUnclothySection
                          controller={controller}
                          selectedAlbum={album}
                          photo={photo}
                          album={album}
                          showPreview={false}
                          onEnqueued={() => {
                            setGenerateOpen(false);
                            onClose?.();
                          }}
                        />
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:hidden">
                  {canGenerate ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => setGenerateOpen(true)}
                      >
                        <Sparkles className="mr-2 size-4" />
                        Generate
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={onClose}
                      >
                        <X className="mr-2 size-4" />
                        Close
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={onClose}
                    >
                      <X className="mr-2 size-4" />
                      Close Preview
                    </button>
                  )}
                </div>

                {generateOpen && !isDesktop ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm lg:hidden"
                      aria-label="Close generate panel"
                      onClick={() => setGenerateOpen(false)}
                    />
                    <div
                      ref={generateSheetRef}
                      className="fixed inset-x-0 bottom-0 z-[60] max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:px-5 lg:hidden"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                      role="region"
                      aria-label="Generate settings"
                    >
                      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                            Generate
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">Task settings</p>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                          aria-label="Close generate panel"
                          onClick={() => setGenerateOpen(false)}
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <GalleryUnclothySection
                          controller={controller}
                          selectedAlbum={album}
                          photo={photo}
                          album={album}
                          showPreview={false}
                          onEnqueued={() => {
                            setGenerateOpen(false);
                            onClose?.();
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

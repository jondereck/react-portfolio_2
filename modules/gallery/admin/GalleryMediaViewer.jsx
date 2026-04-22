'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import GalleryUnclothySection from './GalleryUnclothySection';
import { shouldBlurPhoto } from '@/lib/gallery-media';
import { useUnclothyTasksStore } from '@/store/unclothyTasks';

const SAMSUNG_STATUS_STEPS = ['Queued', 'Processing', 'Generating', 'Finalizing'];

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
  const isGeneratingPreview = Boolean(generatingState);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setGenerateOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!isGeneratingPreview) {
      setStatusIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % SAMSUNG_STATUS_STEPS.length);
    }, 1600);

    return () => clearInterval(interval);
  }, [isGeneratingPreview]);

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
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
                  <div className="min-w-0 sm:flex-1 sm:min-w-0">
                    <Dialog.Title className="truncate text-base font-semibold text-slate-950 dark:text-slate-50 sm:text-lg">
                      {title}
                    </Dialog.Title>
                  </div>
                  <div className="hidden flex-none shrink-0 flex-wrap items-center gap-2 sm:flex">
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
                    <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#f8fbff,#eef4fb_48%,#e2e8f0_100%)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top,#0b1220,#0b1220_30%,#020617_100%)]">
                      <div className="absolute left-4 top-4 z-20 rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                        Preview
                      </div>

                      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-80">
                        <div className="absolute -left-10 top-12 h-44 w-44 rounded-full bg-sky-200/25 blur-3xl dark:bg-sky-400/10" />
                        <div className="absolute -right-12 top-24 h-48 w-48 rounded-full bg-cyan-200/20 blur-3xl dark:bg-cyan-400/10" />
                        <div className="absolute bottom-0 left-1/2 h-36 w-44 -translate-x-1/2 rounded-full bg-blue-200/20 blur-3xl dark:bg-blue-500/10" />
                      </div>

                      <div className="relative z-10 flex h-full min-h-0 w-full items-center justify-center px-4 pt-4 pb-16 sm:px-6 sm:pt-6 sm:pb-20">
                        {(() => {
                          const previewCard = (
                            <div
                              className={`relative inline-flex max-w-full overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-500 dark:border-slate-700/70 dark:bg-slate-950/75 ${
                                isGeneratingPreview ? 'animate-samsung-breathe animate-samsung-glow' : ''
                              }`}
                            >
                              <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
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
                                  <div className="h-[560px] w-[380px] max-w-full rounded-[24px] bg-[radial-gradient(circle_at_top,#cbd5e1,#94a3b8_40%,#334155_100%)] dark:bg-[radial-gradient(circle_at_top,#0f172a,#1f2937_45%,#020617_100%)]" />
                                )}

                                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.42),transparent_65%)] dark:bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.20),transparent_65%)]" />
                                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-[linear-gradient(to_top,rgba(17,24,39,0.16),transparent)] dark:bg-[linear-gradient(to_top,rgba(2,6,23,0.55),transparent)]" />
                                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02)_35%,rgba(15,23,42,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_35%,rgba(2,6,23,0.35))]" />

                                {isGeneratingPreview ? (
                                  <>
                                    <div className="pointer-events-none absolute inset-y-0 left-[-35%] w-[35%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/28 to-transparent animate-samsung-sweep" />

                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3">
                                      <div className="rounded-[18px] border border-white/60 bg-white/45 px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter:blur(0)]:bg-white/35 dark:border-white/10 dark:bg-slate-950/35 supports-[backdrop-filter:blur(0)]:dark:bg-slate-950/30">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300/70">
                                              AI Process
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-slate-900 animate-samsung-fade-up dark:text-slate-50">
                                              {SAMSUNG_STATUS_STEPS[statusIndex]}
                                            </p>
                                          </div>

                                          <div className="flex items-center gap-2 rounded-full bg-white/55 px-3 py-1.5 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter:blur(0)]:bg-white/35 dark:bg-white/10">
                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-samsung-orb" />
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-100">
                                              {generatingState === 'queued' ? 'Queued' : 'Generating'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                                          <div className="h-full w-[58%] rounded-full bg-[linear-gradient(90deg,#60a5fa,#38bdf8,#22c55e)] animate-samsung-progress" />
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          );

                          return previewCard;
                        })()}
                      </div>

                      {shouldBlurPreview ? (
                        <div className="pointer-events-none absolute left-4 top-4 z-30 translate-y-10 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                          NSFW
                        </div>
                      ) : null}

                      <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-wrap items-center justify-between gap-3">
    
                        <p className="text-xs text-slate-600 dark:text-slate-300/80">Click Generate to open the settings panel.</p>
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

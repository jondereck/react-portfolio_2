'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import GalleryUnclothySection from './GalleryUnclothySection';
import { isUnclothyGenerated } from '@/lib/gallery-media';

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
  const shouldBlurPreview = Boolean(photo) && blurUnclothyGenerated && isUnclothyGenerated(photo);

  useEffect(() => {
    if (!open) {
      setGenerateOpen(false);
    }
  }, [open]);

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
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-2"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-2"
            >
              <Dialog.Panel className="flex max-h-[92dvh] w-full max-w-[min(94vw,980px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-3 dark:border-slate-800 sm:px-5 sm:py-4">
                  <div className="min-w-0">
                    <Dialog.Title className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50 sm:text-lg">
                      {title}
                    </Dialog.Title>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    {canGenerate ? (
                      <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => setGenerateOpen(true)}
                      >
                        <Sparkles className="size-4" />
                        <span className="ml-2">Generate</span>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={onClose}
                    >
                      <X className="size-4" />
                      <span className="ml-2">Close</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-slate-100 p-2 dark:bg-slate-950 sm:p-5">
                  <div className="relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-800">
                    {photo ? (
                      <MediaPreview
                        url={photo.imageUrl}
                        mimeType={photo.mimeType}
                        sourceType={photo.sourceType}
                        sourceId={photo.sourceId}
                        alt={title}
                        className={`mx-auto block max-h-[58dvh] max-w-[88vw] object-contain sm:max-h-[68dvh] sm:max-w-[78vw] lg:max-h-[66dvh] lg:max-w-[820px] ${shouldBlurPreview ? 'blur-md' : ''}`}
                        controls
                      />
                    ) : null}
                    {shouldBlurPreview ? (
                      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                        NSFW
                      </div>
                    ) : null}
                  </div>
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

                {generateOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-sm"
                      aria-label="Close generate panel"
                      onClick={() => setGenerateOpen(false)}
                    />
                    <div
                      ref={generateSheetRef}
                      className="fixed inset-x-0 bottom-0 z-[60] max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:inset-x-auto sm:right-6 sm:top-20 sm:bottom-auto sm:w-[420px] sm:max-h-[calc(92dvh-5.5rem)] sm:rounded-[28px] sm:px-5"
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

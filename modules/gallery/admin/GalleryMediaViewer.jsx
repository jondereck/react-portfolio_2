'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';

export default function GalleryMediaViewer({ open, photo, onClose }) {
  const title = photo?.caption || 'Untitled media';

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
                  <button
                    type="button"
                    className="hidden h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:inline-flex"
                    onClick={onClose}
                  >
                    <X className="size-4" />
                    <span className="ml-2">Close</span>
                  </button>
                </div>

                <div className="flex-1 bg-slate-100 p-2 dark:bg-slate-950 sm:p-5">
                  <div className="flex h-full min-h-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-800">
                    {photo ? (
                      <MediaPreview
                        url={photo.imageUrl}
                        mimeType={photo.mimeType}
                        sourceType={photo.sourceType}
                        sourceId={photo.sourceId}
                        alt={title}
                        className="mx-auto block max-h-[58dvh] max-w-[88vw] object-contain sm:max-h-[68dvh] sm:max-w-[78vw] lg:max-h-[66dvh] lg:max-w-[820px]"
                        controls
                      />
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:hidden">
                  <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={onClose}
                  >
                    <X className="mr-2 size-4" />
                    Close Preview
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

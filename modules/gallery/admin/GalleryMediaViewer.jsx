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

        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
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
              <Dialog.Panel className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
                  <div className="min-w-0">
                    <Dialog.Title className="truncate text-base font-semibold text-slate-950 dark:text-slate-50 sm:text-lg">
                      {title}
                    </Dialog.Title>

                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={onClose}
                  >
                    <X className="size-4" />
                    <span className="ml-2">Close</span>
                  </button>
                </div>

                <div className="bg-slate-100 p-3 dark:bg-slate-950 sm:p-6">
                  <div className="flex max-h-[80dvh] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-black dark:border-slate-800">
                    {photo ? (
                      <MediaPreview
                        url={photo.imageUrl}
                        alt={title}
                        className="max-h-[80dvh] w-full object-contain"
                        controls
                      />
                    ) : null}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

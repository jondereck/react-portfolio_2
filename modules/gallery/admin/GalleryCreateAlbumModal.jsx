'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Plus, X } from 'lucide-react';
import {
  buttonStyles,
  createEmptyAlbumForm,
  ghostButtonStyles,
  inputStyles,
} from './galleryAdminShared';

export default function GalleryCreateAlbumModal({
  open,
  onOpenChange,
  onCreate,
  title = 'Create album',
  description = 'Create a new album and make it available immediately.',
  confirmLabel = 'Create album',
  loading = false,
}) {
  const [form, setForm] = useState(() => createEmptyAlbumForm());
  const [submitting, setSubmitting] = useState(false);
  const formId = 'gallery-create-album-form';

  useEffect(() => {
    if (open) {
      setForm(createEmptyAlbumForm());
    }
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const created = await onCreate?.(form);

      if (created) {
        setForm(createEmptyAlbumForm());
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onOpenChange}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-0 sm:p-6">
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
              <Dialog.Panel className="flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:h-auto sm:max-h-[min(42rem,calc(100dvh-3rem))] sm:max-w-xl sm:rounded-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Album creator</p>
                    <Dialog.Title className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">
                      {title}
                    </Dialog.Title>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {description}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={ghostButtonStyles}
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <form
                  id={formId}
                  className="flex-1 overflow-y-auto px-4 py-4 sm:px-5"
                  onSubmit={handleSubmit}
                >
                  <div className="space-y-3">
                    <input
                      className={inputStyles}
                      placeholder="Album name"
                      value={form.name}
                      onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                      required
                    />
                    <input
                      className={inputStyles}
                      placeholder="Slug (optional)"
                      value={form.slug}
                      onChange={(event) => setForm((previous) => ({ ...previous, slug: event.target.value }))}
                    />
                    <textarea
                      className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
                      rows={5}
                      placeholder="Description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, description: event.target.value }))
                      }
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={form.isPublished}
                        onChange={(event) =>
                          setForm((previous) => ({ ...previous, isPublished: event.target.checked }))
                        }
                      />
                      Publish immediately
                    </label>
                  </div>
                </form>

                <div className="border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      className={ghostButtonStyles}
                      onClick={() => onOpenChange(false)}
                      disabled={loading || submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form={formId}
                      className={`${buttonStyles} inline-flex items-center justify-center gap-2`}
                      disabled={loading || submitting}
                    >
                      <Plus className="size-4" />
                      {loading || submitting ? 'Creating...' : confirmLabel}
                    </button>
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

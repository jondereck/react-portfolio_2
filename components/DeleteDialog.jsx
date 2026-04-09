'use client';

import { useState } from 'react';

export default function DeleteDialog({ label, onConfirm, pending }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="h-7 rounded-md bg-rose-600 px-3 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        Delete
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 dark:bg-slate-900">
            <h3 className="text-base font-semibold">Delete {label}?</h3>
            <p className="mt-2 text-sm text-slate-500">This action cannot be undone and will remove the entry permanently.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-9 rounded-md px-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="h-9 rounded-md bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                }}
                disabled={pending}
              >
                {pending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

'use client';

import { useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

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

      <ConfirmModal
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${label}?`}
        description="This action cannot be undone and will remove the entry permanently."
        confirmLabel="Delete"
        loading={pending}
        destructive
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
      />
    </>
  );
}

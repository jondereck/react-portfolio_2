'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ConfirmModal({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description = 'Please confirm to continue.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  destructive = false,
  onConfirm,
  children,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm overflow-hidden rounded-[28px] border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader className="gap-0 border-b border-slate-100 px-5 pb-4 pt-5 text-center dark:border-slate-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <DialogTitle className="mt-4 text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        {children ? <div className="space-y-3 px-5 py-4">{children}</div> : null}

        <DialogFooter className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/20 sm:flex-row-reverse">
          <Button
            type="button"
            className="h-12 w-full rounded-2xl sm:w-auto"
            variant={destructive ? 'destructive' : 'default'}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
          <Button
            type="button"
            className="h-12 w-full rounded-2xl sm:w-auto"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

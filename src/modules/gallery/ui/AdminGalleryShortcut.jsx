'use client';

import Link from 'next/link';

export function AdminGalleryShortcut() {
  return (
    <Link
      href="/admin/gallery"
      className="inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      Open Gallery Manager
    </Link>
  );
}

'use client';

import { cn } from '@/lib/utils';
import { parseErrorResponse } from '@/lib/form-client';

export const cardStyles = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
export const inputStyles =
  'h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
export const textareaStyles =
  'w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';
export const buttonStyles =
  'h-9 rounded-md bg-slate-900 px-3 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900';

export const invalidFieldStyles = 'border-rose-500 focus-visible:ring-rose-400 dark:border-rose-400 dark:focus-visible:ring-rose-400';

export const withFieldError = (baseClassName, hasError) => cn(baseClassName, hasError && invalidFieldStyles);

export const fetcher = (url) =>
  fetch(url, { cache: 'no-store' }).then(async (response) => {
    const cloned = response.clone();
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw (data ? await parseErrorResponse(cloned, 'Request failed') : new Error('Request failed'));
    }

    return data;
  });

export function formatAuditEventLabel(type) {
  return String(type || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatAuditEventDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return '';
  }

  return Object.entries(details)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    .join(' | ');
}

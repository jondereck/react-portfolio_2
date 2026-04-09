'use client';

import DeleteDialog from '@/components/DeleteDialog';

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
};

export default function DataTable({ title, listColumns, items, loading, deletingId, onEdit, onDelete }) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading {title.toLowerCase()}…</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No {title.toLowerCase()} entries yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="px-2 py-2 text-left font-medium text-slate-600">ID</th>
            {listColumns.map((column) => (
              <th key={column.key} className="px-2 py-2 text-left font-medium text-slate-600">
                {column.label}
              </th>
            ))}
            <th className="px-2 py-2 text-left font-medium text-slate-600">Status</th>
            <th className="px-2 py-2 text-right font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-slate-100 dark:border-slate-900">
              <td className="px-2 py-3 font-mono text-xs text-slate-500">#{item.id}</td>
              {listColumns.map((column) => {
                const value = column.formatter ? column.formatter(item) : item[column.key];
                return (
                  <td key={`${item.id}-${column.key}`} className="px-2 py-3">
                    {Array.isArray(value) ? value.join(', ') : value || '—'}
                  </td>
                );
              })}
              <td className="px-2 py-3">
                <div className="flex flex-col gap-1">
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-xs ${
                      item.isPublished
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <span className="text-[11px] text-slate-400">Updated {formatDate(item.updatedAt)}</span>
                </div>
              </td>
              <td className="px-2 py-3">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="h-7 rounded-md px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => onEdit(item)}
                  >
                    Edit
                  </button>
                  <DeleteDialog
                    label={`${title.toLowerCase()} #${item.id}`}
                    onConfirm={() => onDelete(item.id)}
                    pending={deletingId === item.id}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

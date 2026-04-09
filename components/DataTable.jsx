import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DeleteDialog from '@/components/DeleteDialog';

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
};

export default function DataTable({ title, listColumns, items, loading, deletingId, onEdit, onDelete }) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading {title.toLowerCase()}...</p>;
  }

  if (!items.length) {
    return <p className="text-sm text-slate-500">No entries yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">ID</TableHead>
          {listColumns.map((column) => (
            <TableHead key={column.key}>{column.label}</TableHead>
          ))}
          <TableHead>Status</TableHead>
          <TableHead className="w-40 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">#{item.id}</TableCell>
            {listColumns.map((column) => {
              const value = column.formatter ? column.formatter(item) : item[column.key];
              return <TableCell key={`${item.id}-${column.key}`}>{Array.isArray(value) ? value.join(', ') : value || '—'}</TableCell>;
            })}
            <TableCell>
              <div className="flex flex-col gap-1">
                <Badge variant={item.isPublished ? 'default' : 'secondary'}>{item.isPublished ? 'Published' : 'Draft'}</Badge>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">Updated {formatDate(item.updatedAt)}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                  Edit
                </Button>
                <DeleteDialog label={`${title.toLowerCase()} #${item.id}`} pending={deletingId === item.id} onConfirm={() => onDelete(item.id)} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const resources = [
  {
    key: 'certificates',
    title: 'Certificates',
    endpoint: '/api/certificates',
    listColumns: [
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category' },
      { key: 'issuer', label: 'Issuer' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'issuer', label: 'Issuer', type: 'text' },
      { name: 'image', label: 'Image URL', type: 'url' },
      { name: 'link', label: 'Reference Link', type: 'url' },
      { name: 'category', label: 'Category', type: 'text' },
      {
        name: 'issuedAt',
        label: 'Issued At',
        type: 'date',
        required: false,
        serialize: (value) => (value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null),
        deserialize: (value) => (value ? value.substring(0, 10) : ''),
      },
      {
        name: 'expiresAt',
        label: 'Expires At',
        type: 'date',
        required: false,
        serialize: (value) => (value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null),
        deserialize: (value) => (value ? value.substring(0, 10) : ''),
      },
      { name: 'credentialId', label: 'Credential ID', type: 'text', required: false },
      { name: 'sortOrder', label: 'Sort Order', type: 'number', placeholder: '0', required: false },
      { name: 'isPublished', label: 'Published', type: 'checkbox', required: false },
    ],
  },
  {
    key: 'skills',
    title: 'Skills',
    endpoint: '/api/skills',
    listColumns: [
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'level', label: 'Level', formatter: (item) => `${item.level}%` },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'level', label: 'Level (1-100)', type: 'number', placeholder: '50' },
      { name: 'category', label: 'Category', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 3, required: false },
      { name: 'image', label: 'Image URL', type: 'url', required: false },
      { name: 'sortOrder', label: 'Sort Order', type: 'number', placeholder: '0', required: false },
      { name: 'isPublished', label: 'Published', type: 'checkbox', required: false },
    ],
  },
  {
    key: 'portfolio',
    title: 'Portfolio',
    endpoint: '/api/portfolio',
    listColumns: [
      { key: 'title', label: 'Title' },
      { key: 'badge', label: 'Badge' },
      { key: 'tech', label: 'Tech', formatter: (item) => (Array.isArray(item.tech) ? item.tech.join(', ') : '') },
    ],
    fields: [
      { name: 'title', label: 'Project Title', type: 'text' },
      { name: 'slug', label: 'Slug (optional — auto-generated)', type: 'text', required: false },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
      {
        name: 'tech',
        label: 'Tech Stack (comma-separated)',
        type: 'text',
        serialize: (value) =>
          typeof value === 'string'
            ? value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean)
            : [],
        deserialize: (value) => (Array.isArray(value) ? value.join(', ') : ''),
      },
      { name: 'link', label: 'Project Link', type: 'url' },
      { name: 'image', label: 'Image URL', type: 'url' },
      { name: 'badge', label: 'Badge', type: 'text' },
      { name: 'repoUrl', label: 'Repo URL', type: 'url', required: false },
      { name: 'demoUrl', label: 'Demo URL', type: 'url', required: false },
      { name: 'sortOrder', label: 'Sort Order', type: 'number', placeholder: '0', required: false },
      { name: 'isFeatured', label: 'Featured', type: 'checkbox', required: false },
      { name: 'isPublished', label: 'Published', type: 'checkbox', required: false },
    ],
  },
  {
    key: 'experience',
    title: 'Experience',
    endpoint: '/api/experience',
    listColumns: [
      { key: 'title', label: 'Role' },
      { key: 'company', label: 'Company' },
      { key: 'location', label: 'Location' },
    ],
    fields: [
      { name: 'title', label: 'Role Title', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
      { name: 'location', label: 'Location', type: 'text', required: false },
      { name: 'employmentType', label: 'Employment Type', type: 'text', required: false },
      { name: 'image', label: 'Image URL', type: 'url', required: false },
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        serialize: (value) => (value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null),
        deserialize: (value) => (value ? value.substring(0, 10) : ''),
      },
      {
        name: 'endDate',
        label: 'End Date (leave blank for ongoing)',
        type: 'date',
        required: false,
        serialize: (value) => (value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null),
        deserialize: (value) => (value ? value.substring(0, 10) : ''),
      },
      { name: 'isCurrent', label: 'Current role', type: 'checkbox', required: false },
      { name: 'sortOrder', label: 'Sort Order', type: 'number', placeholder: '0', required: false },
      { name: 'isPublished', label: 'Published', type: 'checkbox', required: false },
    ],
  },
];

const defaultFormState = (fields) =>
  fields.reduce((state, field) => {
    state[field.name] = field.type === 'checkbox' ? false : '';
    return state;
  }, {});

const buildPayload = (fields, formState) => {
  const payload = {};
  fields.forEach((field) => {
    const rawValue = formState[field.name];
    if (field.serialize) {
      payload[field.name] = field.serialize(rawValue);
      return;
    }

    if (field.type === 'number') {
      payload[field.name] = rawValue === '' ? undefined : Number(rawValue);
      return;
    }

    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(rawValue);
      return;
    }

    payload[field.name] = rawValue === '' ? null : rawValue;
  });
  return payload;
};

const formatForForm = (fields, item) =>
  fields.reduce((state, field) => {
    const value = item?.[field.name];
    if (field.deserialize) {
      state[field.name] = field.deserialize(value);
      return state;
    }

    if (field.type === 'number') {
      state[field.name] = value ?? '';
      return state;
    }

    if (field.type === 'checkbox') {
      state[field.name] = Boolean(value);
      return state;
    }

    state[field.name] = value ?? '';
    return state;
  }, defaultFormState(fields));

const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' });
const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
};

function PreviewDialogButton({ item, title }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title} Details</DialogTitle>
          <DialogDescription>Raw payload returned by the API.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-xl bg-slate-50 p-4 font-mono text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <pre>{JSON.stringify(item, null, 2)}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialogButton({ label, onConfirm, pending }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" disabled={pending}>
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogDescription>This action cannot be undone and will remove the entry permanently.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {pending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminSection({ resource, adminKey }) {
  const { endpoint, fields, title, listColumns = [] } = resource;
  const [items, setItems] = useState([]);
  const [formState, setFormState] = useState(() => defaultFormState(fields));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load data');
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(`Unable to load ${title}`, { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [endpoint, title]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setEditingId(null);
    setFormState(defaultFormState(fields));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!adminKey) {
      toast.error('Provide the admin API key to save changes.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(fields, formState);
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...payload, id: editingId } : payload;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.error || 'Request failed');
      }

      toast.success(`${title} ${editingId ? 'updated' : 'created'}.`);
      await loadItems();
      resetForm();
    } catch (err) {
      toast.error(`Unable to save ${title}`, { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormState(formatForForm(fields, item));
    toast.message(`Editing ${title.toLowerCase()} #${item.id}`);
  };

  const handleDelete = async (id) => {
    if (!adminKey) {
      toast.error('Provide the admin API key to delete entries.');
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.error || 'Delete failed');
      }

      toast.success(`${title} entry deleted.`);
      await loadItems();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      toast.error(`Unable to delete ${title}`, { description: err instanceof Error ? err.message : undefined });
    } finally {
      setDeletingId(null);
    }
  };

  const renderField = (field) => {
    if (field.type === 'checkbox') {
      return (
        <div
          key={field.name}
          className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{field.label}</p>
            {field.helper && <p className="text-xs text-slate-500 dark:text-slate-400">{field.helper}</p>}
          </div>
          <Switch
            id={`${resource.key}-${field.name}`}
            checked={Boolean(formState[field.name])}
            onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, [field.name]: checked }))}
          />
        </div>
      );
    }

    const commonProps = {
      id: `${resource.key}-${field.name}`,
      name: field.name,
      value: formState[field.name] ?? '',
      onChange: (event) => setFormState((prev) => ({ ...prev, [field.name]: event.target.value })),
      placeholder: field.placeholder,
      required: field.required !== false,
    };

    const colSpan = field.type === 'textarea' ? 'md:col-span-2' : '';

    return (
      <label key={field.name} className={`flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 ${colSpan}`}>
        {field.label}
        {field.type === 'textarea' ? (
          <Textarea {...commonProps} rows={field.rows || 3} />
        ) : (
          <Input type={field.type} {...commonProps} />
        )}
      </label>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Manage {title.toLowerCase()} entries, publish state, and metadata.</CardDescription>
        </div>
        <Button variant="ghost" onClick={loadItems} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => renderField(field))}
          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Create Entry'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </form>
        <div className="mt-8">
          {items.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">No entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  {listColumns.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                  <TableHead>Status</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">#{item.id}</TableCell>
                    {listColumns.map((column) => {
                      const value = column.formatter ? column.formatter(item) : item[column.key];
                      return (
                        <TableCell key={`${item.id}-${column.key}`}>
                          {Array.isArray(value) ? value.join(', ') : value || '—'}
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={item.isPublished ? 'success' : 'secondary'}>
                          {item.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">Updated {formatDate(item.updatedAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                          Edit
                        </Button>
                        <PreviewDialogButton item={item} title={title} />
                        <DeleteDialogButton
                          label={`${title.toLowerCase()} #${item.id}`}
                          onConfirm={() => handleDelete(item.id)}
                          pending={deletingId === item.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SiteContentSection({ adminKey }) {
  const [hero, setHero] = useState({
    eyebrow: '',
    title: '',
    description: '',
    primaryCtaLabel: '',
    primaryCtaHref: '',
    secondaryCtaLabel: '',
    secondaryCtaHref: '',
    image: '',
  });
  const [about, setAbout] = useState({
    title: '',
    body: '',
    highlights: '[]',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSiteContent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/site-content', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load site content');
      const data = await response.json();
      setHero({
        eyebrow: data?.hero?.eyebrow ?? '',
        title: data?.hero?.title ?? '',
        description: data?.hero?.description ?? '',
        primaryCtaLabel: data?.hero?.primaryCtaLabel ?? '',
        primaryCtaHref: data?.hero?.primaryCtaHref ?? '',
        secondaryCtaLabel: data?.hero?.secondaryCtaLabel ?? '',
        secondaryCtaHref: data?.hero?.secondaryCtaHref ?? '',
        image: data?.hero?.image ?? '',
      });
      setAbout({
        title: data?.about?.title ?? '',
        body: data?.about?.body ?? '',
        highlights: Array.isArray(data?.about?.highlights) ? JSON.stringify(data.about.highlights, null, 2) : '[]',
      });
    } catch (err) {
      toast.error('Unable to load hero/about content', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSiteContent();
  }, [loadSiteContent]);

  const submit = async (event) => {
    event.preventDefault();
    if (!adminKey) {
      toast.error('Provide the admin API key to update site content.');
      return;
    }

    let parsedHighlights = [];
    try {
      parsedHighlights = JSON.parse(about.highlights);
      if (!Array.isArray(parsedHighlights)) {
        throw new Error('Highlights must be an array');
      }
    } catch {
      toast.error('Highlights must be valid JSON array.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/site-content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          hero,
          about: {
            title: about.title,
            body: about.body,
            highlights: parsedHighlights,
          },
        }),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail?.error || 'Update failed');
      }

      toast.success('Site content updated.');
      await loadSiteContent();
    } catch (err) {
      toast.error('Unable to update site content', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Content (Hero + About)</CardTitle>
        <CardDescription>Centralized controls for the hero headline, CTA links, and about section.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(hero).map(([field, value]) => (
              <label key={field} className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {field}
                {field === 'description' ? (
                  <Textarea
                    value={value}
                    onChange={(event) => setHero((prev) => ({ ...prev, [field]: event.target.value }))}
                    rows={4}
                    required
                  />
                ) : (
                  <Input
                    type={field === 'image' ? 'url' : 'text'}
                    value={value}
                    onChange={(event) => setHero((prev) => ({ ...prev, [field]: event.target.value }))}
                    required
                  />
                )}
              </label>
            ))}
          </div>

          <div className="grid gap-4">
            <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              About title
              <Input
                type="text"
                value={about.title}
                onChange={(event) => setAbout((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </label>
            <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              About body
              <Textarea
                value={about.body}
                onChange={(event) => setAbout((prev) => ({ ...prev, body: event.target.value }))}
                rows={4}
                required
              />
            </label>
            <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Highlights JSON
              <Textarea
                value={about.highlights}
                onChange={(event) => setAbout((prev) => ({ ...prev, highlights: event.target.value }))}
                rows={6}
                className="font-mono"
                required
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">Provide an array of {"{ label, value }"} objects.</span>
            </label>
          </div>

          <Button type="submit" disabled={saving || loading}>
            {saving ? 'Saving…' : 'Update Site Content'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Toaster position="top-right" richColors />
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm uppercase tracking-wide text-slate-500">Admin Console</p>
          <h1 className="text-3xl font-bold">Portfolio CMS</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage front page content, portfolio, certificates, skills, and experience in one place. Provide the admin API key to unlock write actions.
          </p>
          <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Admin API Key
            <Input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              placeholder="Enter the value of ADMIN_API_KEY"
            />
          </label>
        </header>

        <div className="space-y-6">
          <SiteContentSection adminKey={adminKey} />
          {resources.map((resource) => (
            <AdminSection key={resource.key} resource={resource} adminKey={adminKey} />
          ))}
        </div>
      </div>
    </div>
  );
}

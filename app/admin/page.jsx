'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import DataTable from '@/components/DataTable';
import FormDialog from '@/components/FormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminData } from '@/hooks/useAdminData';
import { toast, Toaster } from 'sonner';

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

function AdminResourceSection({ resource, adminKey }) {
  const adminData = useAdminData(resource, adminKey);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{resource.title}</CardTitle>
          <CardDescription>Manage {resource.title.toLowerCase()} entries, publish state, and metadata.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={adminData.loadItems} disabled={adminData.loading}>
            {adminData.loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <FormDialog
            resource={resource}
            formState={adminData.formState}
            setFormState={adminData.setFormState}
            editingId={adminData.editingId}
            saving={adminData.saving}
            onSubmit={adminData.saveItem}
            onReset={adminData.resetForm}
          />
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          title={resource.title}
          listColumns={resource.listColumns}
          items={adminData.items}
          loading={adminData.loading}
          deletingId={adminData.deletingId}
          onEdit={adminData.editItem}
          onDelete={adminData.deleteItem}
        />
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
    } catch (error) {
      toast.error('Unable to load hero/about content', {
        description: error instanceof Error ? error.message : undefined,
      });
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
    } catch (error) {
      toast.error('Unable to update site content', {
        description: error instanceof Error ? error.message : undefined,
      });
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
              <span className="text-xs text-slate-500 dark:text-slate-400">Provide an array of {'{ label, value }'} objects.</span>
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
        <AdminHeader adminKey={adminKey} setAdminKey={setAdminKey} />
        <div className="space-y-6">
          <SiteContentSection adminKey={adminKey} />
          {resources.map((resource) => (
            <AdminResourceSection key={resource.key} resource={resource} adminKey={adminKey} />
          ))}
        </div>
      </div>
    </div>
  );
}

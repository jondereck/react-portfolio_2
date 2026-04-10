'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/AdminHeader';
import DataTable from '@/components/DataTable';
import FormDialog from '@/components/FormDialog';
import ImageUpload from '@/components/ImageUpload';
import { useAdminData } from '@/hooks/useAdminData';
import { toast } from 'sonner';
import { handleRequest } from '@/lib/handleRequest';
import { useLoadingStore } from '@/store/loading';

const cardStyles = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const buttonStyles =
  'h-8 rounded-md bg-slate-900 px-3 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900';
const inputStyles = 'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
const textareaStyles = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';

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
  const { title, key, fields, listColumns } = resource;
  const {
    items,
    loading,
    saving,
    deletingId,
    editingId,
    dialogOpen,
    formState,
    setFormState,
    loadItems,
    setDialogOpen,
    openCreate,
    openEdit,
    resetForm,
    handleSubmit,
    handleDelete,
    error,
  } =
    useAdminData({
      endpoint: resource.endpoint,
      title,
      fields,
      adminKey,
    });

  const updateField = (fieldName, value) => {
    setFormState((previous) => ({ ...previous, [fieldName]: value }));
  };

  return (
    <section className={cardStyles}>
      <div className="flex flex-col gap-2 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-slate-500">Manage {title.toLowerCase()} entries, publish state, and metadata.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="h-8 rounded-md px-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" onClick={loadItems} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" className="h-8 rounded-md bg-slate-900 px-3 text-sm text-white dark:bg-slate-100 dark:text-slate-900" onClick={openCreate}>
            Add {title}
          </button>
          <FormDialog
            title={title}
            resourceKey={key}
            fields={fields}
            formState={formState}
            editingId={editingId}
            saving={saving}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onChange={updateField}
            onSubmit={handleSubmit}
            onReset={resetForm}
          />
        </div>
      </div>
      <div className="p-6">
        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div>
        )}
        <DataTable
          title={title}
          listColumns={listColumns}
          items={items}
          loading={loading}
          deletingId={deletingId}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>
    </section>
  );
}

function SiteContentSection({ adminKey }) {
  const emptyHighlight = { label: '', value: '' };
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
    highlights: [{ ...emptyHighlight }],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);

  const loadSiteContent = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      setGlobalLoading(true);
      const data = await handleRequest(() => fetch('/api/site-content', { cache: 'no-store' }));

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
        highlights:
          Array.isArray(data?.about?.highlights) && data.about.highlights.length > 0
            ? data.about.highlights.map((item) => ({
                label: typeof item?.label === 'string' ? item.label : '',
                value:
                  typeof item?.value === 'string'
                    ? item.value
                    : Array.isArray(item?.value)
                      ? item.value.filter((line) => typeof line === 'string').join(' ')
                      : '',
              }))
            : [{ ...emptyHighlight }],
      });

    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to load hero/about content';
      setError(message);
      toast.error('Unable to load hero/about content', { description: message });
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  useEffect(() => {
    loadSiteContent();
  }, [loadSiteContent]);

  const submit = async (event) => {
    event.preventDefault();

    if (!adminKey) {
      toast.error('Provide the admin API key to update site content.');
      return;
    }

    const parsedHighlights = about.highlights
      .map((item) => ({
        label: item.label.trim(),
        value: item.value.trim(),
      }))
      .filter((item) => item.label && item.value);

    if (parsedHighlights.length === 0) {
      toast.error('Add at least one highlight with both label and value.');
      return;
    }

    setError('');
    setSaving(true);
    setGlobalLoading(true);

    try {
      const siteContentPromise = handleRequest(() =>
        fetch('/api/site-content', {
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
        }),
      );

      toast.promise(siteContentPromise, {
        loading: 'Saving site content...',
        success: 'Site content updated.',
        error: 'Unable to update site content',
      });

      await siteContentPromise;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('site-content-updated'));
        window.dispatchEvent(new Event('data-updated'));
      }
      await loadSiteContent();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update site content');
    } finally {
      setSaving(false);
      setGlobalLoading(false);
    }
  };

  return (
    <section className={cardStyles}>
      <div className="border-b border-slate-100 p-6 dark:border-slate-800">
        <h2 className="text-xl font-semibold">Site Content (Hero + About)</h2>
        <p className="text-sm text-slate-500">Centralized controls for the hero headline, CTA links, and about section.</p>
      </div>
      <div className="p-6">
        <form onSubmit={submit} className="space-y-6">
          {error && <div className="rounded bg-red-100 p-3 text-red-700">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(hero).map(([field, value]) => {
              if (field === 'image') {
                return (
                  <ImageUpload
                    key={field}
                    value={value}
                    onChange={(uploadedUrl) => setHero((previous) => ({ ...previous, [field]: uploadedUrl }))}
                    label={field}
                  />
                );
              }

              return (
                <label key={field} className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {field}
                  {field === 'description' ? (
                    <textarea
                      value={value}
                      onChange={(event) => setHero((previous) => ({ ...previous, [field]: event.target.value }))}
                      rows={4}
                      required
                      className={textareaStyles}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(event) => setHero((previous) => ({ ...previous, [field]: event.target.value }))}
                      required
                      className={inputStyles}
                    />
                  )}
                </label>
              );
            })}
          </div>

          <div className="grid gap-4">
            <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              About title
              <input
                type="text"
                value={about.title}
                onChange={(event) => setAbout((previous) => ({ ...previous, title: event.target.value }))}
                required
                className={inputStyles}
              />
            </label>
            <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              About body
              <textarea
                value={about.body}
                onChange={(event) => setAbout((previous) => ({ ...previous, body: event.target.value }))}
                rows={4}
                required
                className={textareaStyles}
              />
            </label>
            <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Highlights
              <div className="space-y-2">
                {about.highlights.map((highlight, index) => (
                  <div key={`highlight-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="text"
                      value={highlight.label}
                      onChange={(event) =>
                        setAbout((previous) => ({
                          ...previous,
                          highlights: previous.highlights.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: event.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Label"
                      required
                      className={inputStyles}
                    />
                    <textarea
                      value={highlight.value}
                      onChange={(event) =>
                        setAbout((previous) => ({
                          ...previous,
                          highlights: previous.highlights.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, value: event.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Value"
                      required
                      rows={3}
                      className={textareaStyles}
                    />
                    <button
                      type="button"
                      className="h-10 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
                      onClick={() =>
                        setAbout((previous) => ({
                          ...previous,
                          highlights: previous.highlights.length > 1 ? previous.highlights.filter((_, itemIndex) => itemIndex !== index) : previous.highlights,
                        }))
                      }
                      disabled={about.highlights.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="h-9 rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  onClick={() =>
                    setAbout((previous) => ({
                      ...previous,
                      highlights: [...previous.highlights, { ...emptyHighlight }],
                    }))
                  }
                >
                  + Add Highlight
                </button>
              </div>
            </label>
          </div>

          <button type="submit" disabled={saving || loading} className={buttonStyles}>
            {saving ? 'Saving…' : 'Update Site Content'}
          </button>
        </form>
      </div>
    </section>
  );
}


function SiteConfigSection({ adminKey }) {
  const [siteConfig, setSiteConfig] = useState({
    logoText: '',
    logoImage: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);

  const loadSiteConfig = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      setGlobalLoading(true);
      const configData = await handleRequest(() => fetch('/api/site-config', { cache: 'no-store' }));
      setSiteConfig({
        logoText: typeof configData?.logoText === 'string' ? configData.logoText : '',
        logoImage: typeof configData?.logoImage === 'string' ? configData.logoImage : '',
      });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to load site configuration';
      setError(message);
      toast.error('Unable to load site configuration', { description: message });
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  useEffect(() => {
    loadSiteConfig();
  }, [loadSiteConfig]);

  const submit = async (event) => {
    event.preventDefault();

    if (!adminKey) {
      toast.error('Provide the admin API key to update site config.');
      return;
    }

    setError('');
    setSaving(true);
    setGlobalLoading(true);

    try {
      const updatePromise = handleRequest(() =>
        fetch('/api/site-config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify({
            logoText: siteConfig.logoText.trim(),
            logoImage: siteConfig.logoImage.trim(),
          }),
        }),
      );

      toast.promise(updatePromise, {
        loading: 'Saving site config...',
        success: 'Site config updated.',
        error: 'Unable to update site config',
      });

      await updatePromise;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('site-config-updated'));
        window.dispatchEvent(new Event('data-updated'));
      }
      await loadSiteConfig();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update site config');
    } finally {
      setSaving(false);
      setGlobalLoading(false);
    }
  };

  return (
    <section className={cardStyles}>
      <div className="border-b border-slate-100 p-6 dark:border-slate-800">
        <h2 className="text-xl font-semibold">Site Config</h2>
        <p className="text-sm text-slate-500">Manage logo text and logo image URL used in the navbar.</p>
      </div>
      <div className="p-6">
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded bg-red-100 p-3 text-red-700">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Logo text
              <input
                type="text"
                value={siteConfig.logoText}
                onChange={(event) => setSiteConfig((previous) => ({ ...previous, logoText: event.target.value }))}
                className={inputStyles}
              />
            </label>
            <ImageUpload
              value={siteConfig.logoImage}
              onChange={(uploadedUrl) => setSiteConfig((previous) => ({ ...previous, logoImage: uploadedUrl }))}
              label="Logo image"
            />
          </div>
          <button type="submit" disabled={saving || loading} className={buttonStyles}>
            {saving ? 'Saving…' : 'Update Site Config'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-6xl space-y-8">
        <AdminHeader adminKey={adminKey} onAdminKeyChange={setAdminKey} />

        <div className="space-y-6">
          <SiteConfigSection adminKey={adminKey} />
          <SiteContentSection adminKey={adminKey} />
          {resources.map((resource) => (
            <AdminResourceSection key={resource.key} resource={resource} adminKey={adminKey} />
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import DataTable from '@/components/DataTable';
import FormDialog from '@/components/FormDialog';
import { useAdminData } from '@/hooks/useAdminData';
import { toast } from 'sonner';
import { handleRequest } from '@/lib/handleRequest';
import ImageUpload from '@/components/ImageUpload';
import useSWR from 'swr';
import { notifyRealtimeUpdate, revalidatePublicData } from '@/lib/realtime';

const cardStyles = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const buttonStyles =
  'h-8 rounded-md bg-slate-900 px-3 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900';
const inputStyles = 'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
const textareaStyles = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';
const fetcher = (url) =>
  fetch(url, { cache: 'no-store' }).then((response) => {
    if (!response.ok) {
      throw new Error('Request failed');
    }

    return response.json();
  });

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
      { name: 'image', label: 'Certificate Image', type: 'image' },
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
      { name: 'image', label: 'Skill Image', type: 'image', required: false },
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
      { name: 'summary', label: 'Summary', type: 'textarea', rows: 4 },
      {
        name: 'descriptions',
        label: 'Descriptions (Bullet Items)',
        type: 'string-array',
        required: false,
        helperText: 'Each item becomes one bullet point in the project card.',
      },
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
      { name: 'image', label: 'Project Image', type: 'image' },
      { name: 'badge', label: 'Badge', type: 'text' },
      {
        name: 'demoUrl',
        label: 'Live Demo URL',
        type: 'url',
        required: false,
        helperText: 'Optional. Public deployed app, site, or page visitors can open.',
      },
      {
        name: 'repoUrl',
        label: 'Source Repository URL',
        type: 'url',
        required: false,
        helperText: 'Optional. GitHub, GitLab, or other source repository link.',
      },
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
      { name: 'image', label: 'Experience Image', type: 'image', required: false },
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

function AdminResourceSection({ resource }) {
  const { title, key, fields, listColumns } = resource;
  const {
    items,
    loading,
    saving,
    deletingId,
    editingId,
    editingItem,
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
            editingItem={editingItem}
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

function SiteContentSection() {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { data: siteContent, error: siteContentError, isLoading: loading } = useSWR('/api/site-content', fetcher);

  useEffect(() => {
    if (!siteContent) {
      return;
    }

    setHero({
      eyebrow: siteContent?.hero?.eyebrow ?? '',
      title: siteContent?.hero?.title ?? '',
      description: siteContent?.hero?.description ?? '',
      primaryCtaLabel: siteContent?.hero?.primaryCtaLabel ?? '',
      primaryCtaHref: siteContent?.hero?.primaryCtaHref ?? '',
      secondaryCtaLabel: siteContent?.hero?.secondaryCtaLabel ?? '',
      secondaryCtaHref: siteContent?.hero?.secondaryCtaHref ?? '',
      image: siteContent?.hero?.image ?? '',
    });
    setAbout({
      title: siteContent?.about?.title ?? '',
      body: siteContent?.about?.body ?? '',
      highlights:
        Array.isArray(siteContent?.about?.highlights) && siteContent.about.highlights.length > 0
          ? siteContent.about.highlights.map((item) => ({
              label: typeof item?.label === 'string' ? item.label : '',
              value:
                typeof item?.value === 'string'
                  ? item.value
                  : Array.isArray(item?.value)
                    ? item.value.filter((line) => typeof line === 'string').join(', ')
                    : '',
            }))
          : [{ ...emptyHighlight }],
    });
    setError('');
  }, [siteContent]);

  useEffect(() => {
    if (!siteContentError) {
      return;
    }
    const message = siteContentError instanceof Error ? siteContentError.message : 'Unable to load hero/about content';
    setError(message);
    toast.error('Unable to load hero/about content', { description: message });
  }, [siteContentError]);

  const submit = async (event) => {
    event.preventDefault();

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

    try {
      const siteContentPromise = handleRequest(() =>
        fetch('/api/site-content', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
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
      await revalidatePublicData();
      notifyRealtimeUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update site content');
    } finally {
      setSaving(false);
    }
  };

  return (
<section className={`${cardStyles} overflow-hidden`}>
  {/* Header Section */}
  <div className="border-b border-slate-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Site Content</h2>
    <p className="mt-1 text-sm text-slate-500">Manage your portfolio's first impression and bio.</p>
  </div>

  <div className="p-6">
    <form onSubmit={submit} className="space-y-10">
      {error && (
        <div className="animate-in fade-in slide-in-from-top-1 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

   {/* --- HERO SECTION --- */}
<div className="space-y-6">
  <div className="flex items-center gap-2">
    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Hero Section</span>
    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
  </div>

  <div className="grid gap-6 md:grid-cols-2">
    {Object.entries(hero).map(([field, value]) => {
      const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

      if (field === 'image') {
        return (
          <div key={field} className="md:col-span-2">
            <div className="max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <ImageUpload
                id={`hero-${field}`}
                label={label}
                value={value}
                onChange={(url) => setHero((prev) => ({ ...prev, [field]: url }))}
              />
              <p className="mt-2 text-[10px] text-slate-400 italic">Recommended: 800x800px or smaller.</p>
            </div>
          </div>
        );
      }

      return (
        <label key={field} className="group flex flex-col space-y-2">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => setHero((prev) => ({ ...prev, [field]: e.target.value }))}
            className={inputStyles}
          />
        </label>
      );
    })}
  </div>
</div>

      {/* --- ABOUT SECTION --- */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">About Section</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
        </div>

        <div className="grid gap-6">
          <label className="flex flex-col space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">About Title</span>
            <input
              type="text"
              value={about.title}
              onChange={(e) => setAbout((prev) => ({ ...prev, title: e.target.value }))}
              required
              className={inputStyles}
            />
          </label>

          <label className="flex flex-col space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bio / Body</span>
            <textarea
              value={about.body}
              onChange={(e) => setAbout((prev) => ({ ...prev, body: e.target.value }))}
              rows={5}
              required
              className={textareaStyles}
            />
          </label>

          {/* Highlights List */}
     {/* --- KEY HIGHLIGHTS (Improved) --- */}
<div className="mt-10 space-y-4">
  <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Key Highlights</h3>
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
      {about.highlights.length} TOTAL
    </span>
  </div>
  
  <div className="space-y-3">
    {about.highlights.map((highlight, index) => (
      <div 
        key={`highlight-${index}`} 
        className="group relative flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-3 transition-shadow hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
      >
        {/* Label - Fixed Width for alignment */}
        <div className="w-1/3 md:w-1/4">
          <label className="text-[10px] font-bold uppercase text-slate-400">Label</label>
          <input
            type="text"
            value={highlight.label}
            onChange={(e) =>
              setAbout((prev) => ({
                ...prev,
                highlights: prev.highlights.map((item, idx) =>
                  idx === index ? { ...item, label: e.target.value } : item
                ),
              }))
            }
            placeholder="Label"
            className="mt-1 w-full border-none bg-transparent p-0 text-sm font-semibold focus:ring-0 dark:text-white"
          />
        </div>

        {/* Vertical Divider */}
        <div className="h-12 w-px bg-slate-100 dark:bg-slate-700 mt-2"></div>

        {/* Value - Takes up remaining space */}
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase text-slate-400">Value / Description</label>
          <textarea
            value={highlight.value}
            onChange={(e) =>
              setAbout((prev) => ({
                ...prev,
                highlights: prev.highlights.map((item, idx) =>
                  idx === index ? { ...item, value: e.target.value } : item
                ),
              }))
            }
            placeholder="React, Next.js, TypeScript, Tailwind CSS"
            rows={2}
            className="mt-1 w-full border-none bg-transparent p-0 text-sm leading-relaxed focus:ring-0 dark:text-slate-300"
          />

        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={() =>
            setAbout((prev) => ({
              ...prev,
              highlights: prev.highlights.filter((_, idx) => idx !== index),
            }))
          }
          className="mt-4 flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    ))}
  </div>

  <button
    type="button"
    onClick={() => setAbout((prev) => ({ ...prev, highlights: [...prev.highlights, { ...emptyHighlight }] }))}
    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 dark:border-slate-800 dark:hover:bg-slate-900"
  >
    + Add Highlight Item
  </button>
</div>
        </div>
      </div>

      {/* Footer / Submit */}
      <div className="sticky bottom-0 -mx-6 -mb-6 mt-10 border-t border-slate-100 bg-white/80 p-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <button 
          type="submit" 
          disabled={saving || loading} 
          className={`${buttonStyles} w-full md:w-auto md:min-w-[200px] shadow-lg shadow-blue-500/20`}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Saving Changes...
            </span>
          ) : 'Update Site Content'}
        </button>
      </div>
    </form>
  </div>
</section>
  );
}


function SiteConfigSection() {
  const [siteConfig, setSiteConfig] = useState({
    logoText: '',
    logoImage: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { data: siteConfigData, error: siteConfigError, isLoading: loading } = useSWR('/api/site-config', fetcher);

  useEffect(() => {
    if (!siteConfigData) {
      return;
    }

    setSiteConfig({
      logoText: typeof siteConfigData?.logoText === 'string' ? siteConfigData.logoText : '',
      logoImage: typeof siteConfigData?.logoImage === 'string' ? siteConfigData.logoImage : '',
    });
    setError('');
  }, [siteConfigData]);

  useEffect(() => {
    if (!siteConfigError) {
      return;
    }
    const message = siteConfigError instanceof Error ? siteConfigError.message : 'Unable to load site configuration';
    setError(message);
    toast.error('Unable to load site configuration', { description: message });
  }, [siteConfigError]);

  const submit = async (event) => {
    event.preventDefault();

    setError('');
    setSaving(true);

    try {
      const updatePromise = handleRequest(() =>
        fetch('/api/site-config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
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
      await revalidatePublicData();
      notifyRealtimeUpdate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update site config');
    } finally {
      setSaving(false);
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
              id="site-config-logo-image"
              label="Logo image"
              value={siteConfig.logoImage}
              onChange={(uploadedUrl) => setSiteConfig((previous) => ({ ...previous, logoImage: uploadedUrl }))}
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
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      try {
        const response = await fetch('/api/admin/verify', { cache: 'no-store' });
        if (!response.ok) {
          router.replace('/');
          return;
        }

        if (mounted) {
          setIsReady(true);
        }
      } catch {
        router.replace('/');
      }
    };

    verifySession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    router.push('/');
  };

  if (!isReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-6xl space-y-8">
        <AdminHeader onLogout={handleLogout} />

        <div className="space-y-6">
          <SiteConfigSection />
          <SiteContentSection />
          {resources.map((resource) => (
            <AdminResourceSection key={resource.key} resource={resource} />
          ))}
        </div>
      </div>
    </div>
  );
}

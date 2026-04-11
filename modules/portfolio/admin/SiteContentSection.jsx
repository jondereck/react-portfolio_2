'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import { handleRequest } from '@/lib/handleRequest';
import { notifyRealtimeUpdate, revalidatePublicData } from '@/lib/realtime';
import AdminSectionHeader from '@/components/admin/shared/AdminSectionHeader';

const cardStyles = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const inputStyles = 'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
const textareaStyles = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';
const buttonStyles =
  'h-9 rounded-md bg-slate-900 px-3 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900';

const fetcher = (url) =>
  fetch(url, { cache: 'no-store' }).then((response) => {
    if (!response.ok) {
      throw new Error('Request failed');
    }

    return response.json();
  });

export default function SiteContentSection() {
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
    <section className={cardStyles}>
      <AdminSectionHeader
        title="Homepage Content"
        description="Manage hero and about section content for the public homepage."
      />
      <div className="p-6">
        <form onSubmit={submit} className="space-y-8">
          {error ? <div className="rounded bg-red-100 p-3 text-red-700">{error}</div> : null}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hero</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(hero).map(([field, value]) => {
                const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

                if (field === 'image') {
                  return (
                    <div key={field} className="md:col-span-2 max-w-sm">
                      <ImageUpload
                        id={`hero-${field}`}
                        label={label}
                        value={value}
                        onChange={(url) => setHero((prev) => ({ ...prev, [field]: url }))}
                      />
                    </div>
                  );
                }

                return (
                  <label key={field} className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    {label}
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

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">About</h3>
            <div className="grid gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                About title
                <input
                  type="text"
                  value={about.title}
                  onChange={(e) => setAbout((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  className={inputStyles}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Body
                <textarea
                  value={about.body}
                  onChange={(e) => setAbout((prev) => ({ ...prev, body: e.target.value }))}
                  rows={5}
                  required
                  className={textareaStyles}
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Highlights</h4>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    onClick={() => setAbout((prev) => ({ ...prev, highlights: [...prev.highlights, { ...emptyHighlight }] }))}
                  >
                    Add highlight
                  </button>
                </div>
                {about.highlights.map((highlight, index) => (
                  <div key={`highlight-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[200px_1fr_auto] dark:border-slate-700">
                    <input
                      type="text"
                      value={highlight.label}
                      onChange={(e) =>
                        setAbout((prev) => ({
                          ...prev,
                          highlights: prev.highlights.map((item, idx) =>
                            idx === index ? { ...item, label: e.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Label"
                      className={inputStyles}
                    />
                    <textarea
                      value={highlight.value}
                      onChange={(e) =>
                        setAbout((prev) => ({
                          ...prev,
                          highlights: prev.highlights.map((item, idx) =>
                            idx === index ? { ...item, value: e.target.value } : item,
                          ),
                        }))
                      }
                      rows={2}
                      placeholder="Value"
                      className={textareaStyles}
                    />
                    <button
                      type="button"
                      className="h-10 rounded-md border border-red-300 px-3 text-sm text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300"
                      onClick={() =>
                        setAbout((prev) => ({
                          ...prev,
                          highlights: prev.highlights.filter((_, idx) => idx !== index),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving || loading} className={buttonStyles}>
            {saving ? 'Saving...' : 'Update Homepage Content'}
          </button>
        </form>
      </div>
    </section>
  );
}

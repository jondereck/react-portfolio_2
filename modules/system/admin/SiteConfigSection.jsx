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
const buttonStyles =
  'h-9 rounded-md bg-slate-900 px-3 text-sm text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900';

const fetcher = (url) =>
  fetch(url, {
    cache: 'no-store',
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Request failed');
    }

    return response.json();
  });

export default function SiteConfigSection() {
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
      <AdminSectionHeader
        title="General Site Settings"
        description="Manage logo and global identity settings used across the public site."
      />
      <div className="p-6">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded bg-red-100 p-3 text-red-700">{error}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
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
            {saving ? 'Saving...' : 'Update Site Config'}
          </button>
        </form>
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import AdminSectionHeader from '@/components/admin/shared/AdminSectionHeader';
import FieldErrorText from '@/components/forms/FieldErrorText';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { clearFieldErrors, getFieldError, normalizeFormError } from '@/lib/form-client';
import { handleRequest } from '@/lib/handleRequest';
import { notifyRealtimeUpdate, revalidatePublicData } from '@/lib/realtime';
import { buttonStyles, cardStyles, fetcher, inputStyles, withFieldError } from '@/modules/system/admin/settingsShared';

export default function SiteConfigSection() {
  const [siteConfig, setSiteConfig] = useState({
    logoText: '',
    logoImage: '',
    portfolioTheme: 'editorial-bento',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { data: siteConfigData, error: siteConfigError, isLoading: loading } = useSWR('/api/site-config', fetcher);

  useEffect(() => {
    if (!siteConfigData) {
      return;
    }

    setSiteConfig({
      logoText: typeof siteConfigData?.logoText === 'string' ? siteConfigData.logoText : '',
      logoImage: typeof siteConfigData?.logoImage === 'string' ? siteConfigData.logoImage : '',
      portfolioTheme:
        ['classic', 'editorial-bento', 'neo-editorial'].includes(siteConfigData?.portfolioTheme)
          ? siteConfigData.portfolioTheme
          : 'editorial-bento',
    });
    setFormError('');
    setFieldErrors({});
  }, [siteConfigData]);

  useEffect(() => {
    if (!siteConfigError) {
      return;
    }

    const message = siteConfigError instanceof Error ? siteConfigError.message : 'Unable to load site configuration';
    setFormError(message);
    toast.error('Unable to load site configuration', { description: message });
  }, [siteConfigError]);

  const submit = async (event) => {
    event.preventDefault();

    setFormError('');
    setFieldErrors({});
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
            portfolioTheme: siteConfig.portfolioTheme,
          }),
        }),
      );

      toast.promise(updatePromise, {
        loading: 'Saving site config...',
        success: 'Site config updated.',
        error: (error) => (error instanceof Error ? error.message : 'Unable to update site config'),
      });

      await updatePromise;
      await revalidatePublicData();
      notifyRealtimeUpdate();
    } catch (requestError) {
      const nextError = normalizeFormError(requestError, 'Unable to update site config');
      setFormError(nextError.formError);
      setFieldErrors(nextError.fieldErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cardStyles}>
      <AdminSectionHeader
        title="General Site Settings"
        description="Manage logo, global identity, and the public portfolio theme."
      />
      <div className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <FormErrorSummary error={formError} fieldErrors={fieldErrors} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Logo text
              <input
                type="text"
                value={siteConfig.logoText}
                onChange={(event) => {
                  setSiteConfig((previous) => ({ ...previous, logoText: event.target.value }));
                  setFieldErrors((current) => clearFieldErrors(current, 'logoText'));
                }}
                aria-invalid={Boolean(getFieldError(fieldErrors, 'logoText'))}
                className={withFieldError(inputStyles, Boolean(getFieldError(fieldErrors, 'logoText')))}
              />
              <FieldErrorText error={getFieldError(fieldErrors, 'logoText')} />
            </label>

            <div className="space-y-2">
              <ImageUpload
                id="site-config-logo-image"
                label="Logo image"
                value={siteConfig.logoImage}
                onChange={(uploadedUrl) => {
                  setSiteConfig((previous) => ({ ...previous, logoImage: uploadedUrl }));
                  setFieldErrors((current) => clearFieldErrors(current, 'logoImage'));
                }}
              />
              <FieldErrorText error={getFieldError(fieldErrors, 'logoImage')} />
            </div>
          </div>

          <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div>
              <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">Portfolio Theme</legend>
              <p className="mt-1 text-sm text-slate-500">
                Choose the UI style used by the public portfolio without changing its content or behavior.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  value: 'editorial-bento',
                  title: 'Editorial Bento',
                  description: 'Light premium bento layout with bold borders, lime and blue accents.',
                },
                {
                  value: 'neo-editorial',
                  title: 'Neo Editorial',
                  description: 'Sticky side rail, orange accent, case-study blocks, and heavy ink borders.',
                },
                {
                  value: 'classic',
                  title: 'Classic',
                  description: 'The current dark/light portfolio interface and section styling.',
                },
              ].map((theme) => {
                const selected = siteConfig.portfolioTheme === theme.value;

                return (
                  <label
                    key={theme.value}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                      selected
                        ? 'border-cyan-400 bg-cyan-50 text-slate-950 dark:border-cyan-300 dark:bg-cyan-950/40 dark:text-slate-100'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="portfolioTheme"
                      value={theme.value}
                      checked={selected}
                      onChange={(event) => {
                        setSiteConfig((previous) => ({ ...previous, portfolioTheme: event.target.value }));
                        setFieldErrors((current) => clearFieldErrors(current, 'portfolioTheme'));
                      }}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold">{theme.title}</span>
                      <span className="mt-1 block text-sm text-slate-500">{theme.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <FieldErrorText error={getFieldError(fieldErrors, 'portfolioTheme')} />
          </fieldset>

          <button type="submit" disabled={saving || loading} className={buttonStyles}>
            {saving ? 'Saving...' : 'Update Site Config'}
          </button>
        </form>
      </div>
    </section>
  );
}

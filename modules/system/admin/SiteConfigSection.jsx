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
        description="Manage logo and global identity settings used across the public site."
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

          <button type="submit" disabled={saving || loading} className={buttonStyles}>
            {saving ? 'Saving...' : 'Update Site Config'}
          </button>
        </form>
      </div>
    </section>
  );
}

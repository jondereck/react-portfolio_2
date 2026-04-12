'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import AdminSectionHeader from '@/components/admin/shared/AdminSectionHeader';
import AdminStatusBadge from '@/components/admin/shared/AdminStatusBadge';
import { handleRequest } from '@/lib/handleRequest';
import { buttonStyles, cardStyles, fetcher, inputStyles } from '@/modules/system/admin/settingsShared';

const emptyState = {
  contactRecipientEmail: '',
  contactSenderName: '',
  contactSenderEmail: '',
  cloudinaryFolder: '',
  googleDriveImportEnabled: true,
};

export default function IntegrationsSettingsSection() {
  const [integrations, setIntegrations] = useState(emptyState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { data, error: requestError, isLoading, mutate } = useSWR('/api/admin/settings', fetcher);

  useEffect(() => {
    if (!data?.settings?.integrations) {
      return;
    }

    setIntegrations({
      contactRecipientEmail: data.settings.integrations.contactRecipientEmail ?? '',
      contactSenderName: data.settings.integrations.contactSenderName ?? '',
      contactSenderEmail: data.settings.integrations.contactSenderEmail ?? '',
      cloudinaryFolder: data.settings.integrations.cloudinaryFolder ?? '',
      googleDriveImportEnabled: data.settings.integrations.googleDriveImportEnabled !== false,
    });
    setError('');
  }, [data]);

  useEffect(() => {
    if (!requestError) {
      return;
    }

    const message = requestError instanceof Error ? requestError.message : 'Unable to load integration settings';
    setError(message);
    toast.error('Unable to load integration settings', { description: message });
  }, [requestError]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updatePromise = handleRequest(() =>
        fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            integrations: {
              contactRecipientEmail: integrations.contactRecipientEmail.trim(),
              contactSenderName: integrations.contactSenderName.trim(),
              contactSenderEmail: integrations.contactSenderEmail.trim(),
              cloudinaryFolder: integrations.cloudinaryFolder.trim(),
              googleDriveImportEnabled: integrations.googleDriveImportEnabled,
            },
          }),
        }),
      );

      toast.promise(updatePromise, {
        loading: 'Saving integration settings...',
        success: 'Integration settings updated.',
        error: 'Unable to update integration settings',
      });

      await updatePromise;
      await mutate();
    } catch (requestFailure) {
      setError(requestFailure instanceof Error ? requestFailure.message : 'Unable to update integration settings');
    } finally {
      setSaving(false);
    }
  };

  const statuses = Array.isArray(data?.statuses) ? data.statuses : [];

  return (
    <section id="integrations" className={cardStyles}>
      <AdminSectionHeader
        title="Integrations"
        description="Manage safe integration settings and check service connection status without exposing API secrets."
      />
      <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded bg-red-100 p-3 text-red-700">{error}</div> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Contact recipient email
              <input
                type="email"
                value={integrations.contactRecipientEmail}
                onChange={(event) => setIntegrations((previous) => ({ ...previous, contactRecipientEmail: event.target.value }))}
                className={inputStyles}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Contact sender email
              <input
                type="email"
                value={integrations.contactSenderEmail}
                onChange={(event) => setIntegrations((previous) => ({ ...previous, contactSenderEmail: event.target.value }))}
                className={inputStyles}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
              Contact sender name
              <input
                type="text"
                value={integrations.contactSenderName}
                onChange={(event) => setIntegrations((previous) => ({ ...previous, contactSenderName: event.target.value }))}
                className={inputStyles}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
              Cloudinary base folder
              <input
                type="text"
                value={integrations.cloudinaryFolder}
                onChange={(event) => setIntegrations((previous) => ({ ...previous, cloudinaryFolder: event.target.value }))}
                className={inputStyles}
              />
            </label>
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
              <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span>Enable Google Drive imports</span>
                <input
                  type="checkbox"
                  checked={integrations.googleDriveImportEnabled}
                  onChange={(event) =>
                    setIntegrations((previous) => ({ ...previous, googleDriveImportEnabled: event.target.checked }))
                  }
                />
              </label>
            </div>
          </div>

          <button type="submit" disabled={saving || isLoading} className={buttonStyles}>
            {saving ? 'Saving...' : 'Update Integration Settings'}
          </button>
        </form>

        <div className="space-y-3">
          {statuses.map((status) => (
            <div key={status.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{status.label}</h3>
                <AdminStatusBadge
                  label={status.state === 'connected' ? 'Connected' : status.state === 'disabled' ? 'Disabled' : 'Needs setup'}
                  tone={status.state === 'connected' ? 'success' : status.state === 'warning' ? 'warning' : 'neutral'}
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{status.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

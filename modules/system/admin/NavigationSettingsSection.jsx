'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import AdminSectionHeader from '@/components/admin/shared/AdminSectionHeader';
import { handleRequest } from '@/lib/handleRequest';
import { notifyRealtimeUpdate, revalidatePublicData } from '@/lib/realtime';
import { buttonStyles, cardStyles, fetcher, inputStyles } from '@/modules/system/admin/settingsShared';

const emptyLink = {
  label: '',
  target: '',
  type: 'section',
  isVisible: true,
  sortOrder: 0,
};

const normalizeTarget = (link) => {
  const trimmedTarget = String(link.target || '').trim();
  if (!trimmedTarget) {
    return '';
  }

  if (link.type === 'section') {
    return `#${trimmedTarget.replace(/^#/, '')}`;
  }

  return trimmedTarget;
};

export default function NavigationSettingsSection() {
  const [navigation, setNavigation] = useState({ links: [{ ...emptyLink }], showAdminButton: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { data, error: requestError, isLoading, mutate } = useSWR('/api/site-config', fetcher);

  useEffect(() => {
    if (!data?.navigation) {
      return;
    }

    setNavigation({
      links:
        Array.isArray(data.navigation.links) && data.navigation.links.length > 0
          ? data.navigation.links.map((link) => ({
              label: typeof link.label === 'string' ? link.label : '',
              target: typeof link.target === 'string' ? link.target : '',
              type: link.type === 'url' ? 'url' : 'section',
              isVisible: link.isVisible !== false,
              sortOrder: Number.isFinite(Number(link.sortOrder)) ? Number(link.sortOrder) : 0,
            }))
          : [{ ...emptyLink }],
      showAdminButton: data.navigation.showAdminButton !== false,
    });
    setError('');
  }, [data]);

  useEffect(() => {
    if (!requestError) {
      return;
    }

    const message = requestError instanceof Error ? requestError.message : 'Unable to load navigation settings';
    setError(message);
    toast.error('Unable to load navigation settings', { description: message });
  }, [requestError]);

  const updateLink = (index, field, value) => {
    setNavigation((previous) => ({
      ...previous,
      links: previous.links.map((link, linkIndex) => (linkIndex === index ? { ...link, [field]: value } : link)),
    }));
  };

  const addLink = () => {
    setNavigation((previous) => ({
      ...previous,
      links: [
        ...previous.links,
        {
          ...emptyLink,
          sortOrder: previous.links.length + 1,
        },
      ],
    }));
  };

  const removeLink = (index) => {
    setNavigation((previous) => ({
      ...previous,
      links: previous.links.filter((_, linkIndex) => linkIndex !== index),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    const links = navigation.links
      .map((link, index) => ({
        label: String(link.label || '').trim(),
        target: normalizeTarget(link),
        type: link.type === 'url' ? 'url' : 'section',
        isVisible: link.isVisible !== false,
        sortOrder: Number.isFinite(Number(link.sortOrder)) ? Number(link.sortOrder) : index + 1,
      }))
      .filter((link) => link.label && link.target);

    if (links.length === 0) {
      toast.error('Add at least one navigation link.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updatePromise = handleRequest(() =>
        fetch('/api/site-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            navigation: {
              links,
              showAdminButton: navigation.showAdminButton,
            },
          }),
        }),
      );

      toast.promise(updatePromise, {
        loading: 'Saving navigation settings...',
        success: 'Navigation settings updated.',
        error: 'Unable to update navigation settings',
      });

      await updatePromise;
      await mutate();
      await revalidatePublicData();
      notifyRealtimeUpdate();
    } catch (requestFailure) {
      setError(requestFailure instanceof Error ? requestFailure.message : 'Unable to update navigation settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="navigation" className={cardStyles}>
      <AdminSectionHeader
        title="Navigation Settings"
        description="Manage header and mobile navigation labels, targets, ordering, and visibility."
        actions={
          <button type="button" className={buttonStyles} onClick={addLink}>
            Add Link
          </button>
        }
      />
      <div className="p-6">
        <form onSubmit={submit} className="space-y-4">
          {error ? <div className="rounded bg-red-100 p-3 text-red-700">{error}</div> : null}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Show Admin button in the public navbar</span>
              <input
                type="checkbox"
                checked={navigation.showAdminButton}
                onChange={(event) => setNavigation((previous) => ({ ...previous, showAdminButton: event.target.checked }))}
              />
            </label>
          </div>

          <div className="space-y-3">
            {navigation.links.map((link, index) => (
              <div
                key={`nav-link-${index}`}
                className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1.3fr_1.3fr_120px_120px_auto_auto] dark:border-slate-800 dark:bg-slate-950/40"
              >
                <input
                  type="text"
                  value={link.label}
                  onChange={(event) => updateLink(index, 'label', event.target.value)}
                  placeholder="Label"
                  className={inputStyles}
                />
                <input
                  type="text"
                  value={link.target}
                  onChange={(event) => updateLink(index, 'target', event.target.value)}
                  placeholder={link.type === 'section' ? '#portfolio' : 'https://example.com'}
                  className={inputStyles}
                />
                <select
                  value={link.type}
                  onChange={(event) => updateLink(index, 'type', event.target.value)}
                  className={inputStyles}
                >
                  <option value="section">Section</option>
                  <option value="url">URL</option>
                </select>
                <input
                  type="number"
                  value={link.sortOrder}
                  onChange={(event) => updateLink(index, 'sortOrder', Number(event.target.value))}
                  min={0}
                  className={inputStyles}
                />
                <label className="flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={link.isVisible}
                    onChange={(event) => updateLink(index, 'isVisible', event.target.checked)}
                  />
                  Visible
                </label>
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  disabled={navigation.links.length === 1}
                  className="rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving || isLoading} className={buttonStyles}>
            {saving ? 'Saving...' : 'Update Navigation Settings'}
          </button>
        </form>
      </div>
    </section>
  );
}

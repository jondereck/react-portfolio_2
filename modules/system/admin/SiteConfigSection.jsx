'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Shuffle } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import AdminSectionHeader from '@/components/admin/shared/AdminSectionHeader';
import FieldErrorText from '@/components/forms/FieldErrorText';
import FormErrorSummary from '@/components/forms/FormErrorSummary';
import { clearFieldErrors, getFieldError, normalizeFormError } from '@/lib/form-client';
import { handleRequest } from '@/lib/handleRequest';
import { PORTFOLIO_THEMES, isPortfolioThemeId, normalizePortfolioThemeRandomPool } from '@/lib/portfolioThemes';
import { notifyRealtimeUpdate, revalidatePublicData } from '@/lib/realtime';
import { buttonStyles, cardStyles, fetcher, inputStyles, withFieldError } from '@/modules/system/admin/settingsShared';

const isThemeMode = (value) => value === 'random' || isPortfolioThemeId(value);

export default function SiteConfigSection() {
  const [siteConfig, setSiteConfig] = useState({
    logoText: '',
    logoImage: '',
    portfolioTheme: 'editorial-bento',
    portfolioThemeRotationMinutes: 0,
    portfolioThemeRandomPool: PORTFOLIO_THEMES.map((theme) => theme.value),
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
        isThemeMode(siteConfigData?.portfolioTheme)
          ? siteConfigData.portfolioTheme
          : 'editorial-bento',
      portfolioThemeRotationMinutes:
        typeof siteConfigData?.portfolioThemeRotationMinutes === 'number'
          ? siteConfigData.portfolioThemeRotationMinutes
          : 0,
      portfolioThemeRandomPool: normalizePortfolioThemeRandomPool(siteConfigData?.portfolioThemeRandomPool),
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

    if (siteConfig.portfolioThemeRandomPool.length === 0) {
      setFieldErrors({ portfolioThemeRandomPool: ['Choose at least one theme for random selection.'] });
      setSaving(false);
      return;
    }

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
            portfolioThemeRotationMinutes: siteConfig.portfolioThemeRotationMinutes,
            portfolioThemeRandomPool: siteConfig.portfolioThemeRandomPool,
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

  const randomizeTheme = () => {
    const pool = siteConfig.portfolioThemeRandomPool.filter(isPortfolioThemeId);
    if (pool.length === 0) {
      setFieldErrors((current) => ({
        ...current,
        portfolioThemeRandomPool: ['Choose at least one theme for random selection.'],
      }));
      return;
    }

    const nextTheme = pool[Math.floor(Math.random() * pool.length)];
    setSiteConfig((previous) => ({ ...previous, portfolioTheme: 'random' }));
    setFieldErrors((current) => clearFieldErrors(clearFieldErrors(current, 'portfolioTheme'), 'portfolioThemeRandomPool'));
  };

  const toggleRandomPoolTheme = (themeValue) => {
    setSiteConfig((previous) => {
      const included = previous.portfolioThemeRandomPool.includes(themeValue);
      return {
        ...previous,
        portfolioThemeRandomPool: included
          ? previous.portfolioThemeRandomPool.filter((value) => value !== themeValue)
          : [...previous.portfolioThemeRandomPool, themeValue],
      };
    });
    setFieldErrors((current) => clearFieldErrors(current, 'portfolioThemeRandomPool'));
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
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">Portfolio Theme</legend>
                <p className="mt-1 text-sm text-slate-500">
                  Choose the UI style used by the public portfolio without changing its content or behavior.
                </p>
              </div>
              <button
                type="button"
                onClick={randomizeTheme}
                className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <Shuffle className="h-4 w-4" />
                Random
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div
                className={`rounded-xl border p-4 transition ${
                  siteConfig.portfolioTheme === 'random'
                    ? 'border-cyan-400 bg-cyan-50 text-slate-950 dark:border-cyan-300 dark:bg-cyan-950/40 dark:text-slate-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="radio"
                    name="portfolioTheme"
                    value="random"
                    checked={siteConfig.portfolioTheme === 'random'}
                    onChange={() => {
                      setSiteConfig((previous) => ({ ...previous, portfolioTheme: 'random' }));
                      setFieldErrors((current) => clearFieldErrors(current, 'portfolioTheme'));
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold">Random</span>
                    <span className="mt-1 block text-sm text-slate-500">
                      Rotate between the themes selected below.
                    </span>
                  </span>
                </label>

                {siteConfig.portfolioTheme === 'random' ? (
                  <label className="mt-4 block border-t border-slate-200 pt-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    Rotation interval (minutes). 0 = every visit
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={60 * 24 * 30}
                      value={siteConfig.portfolioThemeRotationMinutes ?? 0}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        setSiteConfig((previous) => ({
                          ...previous,
                          portfolioThemeRotationMinutes: Number.isFinite(nextValue) ? Math.max(0, Math.min(nextValue, 60 * 24 * 30)) : 0,
                        }));
                        setFieldErrors((current) => clearFieldErrors(current, 'portfolioThemeRotationMinutes'));
                      }}
                      className={withFieldError(inputStyles, Boolean(getFieldError(fieldErrors, 'portfolioThemeRotationMinutes')))}
                    />
                    <FieldErrorText error={getFieldError(fieldErrors, 'portfolioThemeRotationMinutes')} />
                  </label>
                ) : null}
              </div>
              {PORTFOLIO_THEMES.map((theme) => {
                const selected = siteConfig.portfolioTheme === theme.value;
                const includedInRandom = siteConfig.portfolioThemeRandomPool.includes(theme.value);

                return (
                  <div
                    key={theme.value}
                    className={`rounded-xl border p-4 transition ${
                      selected
                        ? 'border-cyan-400 bg-cyan-50 text-slate-950 dark:border-cyan-300 dark:bg-cyan-950/40 dark:text-slate-100'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    <label className="flex cursor-pointer gap-3">
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
                    <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-slate-200 pt-3 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={includedInRandom}
                        onChange={() => toggleRandomPoolTheme(theme.value)}
                        className="h-4 w-4 rounded border-slate-300 text-cyan-600"
                      />
                      Include in random
                    </label>
                  </div>
                );
              })}
            </div>
            <FieldErrorText error={getFieldError(fieldErrors, 'portfolioTheme')} />
            <FieldErrorText error={getFieldError(fieldErrors, 'portfolioThemeRandomPool')} />
          </fieldset>

          <button type="submit" disabled={saving || loading} className={buttonStyles}>
            {saving ? 'Saving...' : 'Update Site Config'}
          </button>
        </form>
      </div>
    </section>
  );
}

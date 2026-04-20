'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { toast } from 'sonner';
import MediaPreview from '@/app/admin/gallery/components/MediaPreview';
import { useUnclothyTasksStore } from '@/store/unclothyTasks';
import { buttonStyles, fetchJson, ghostButtonStyles, inputStyles } from './galleryAdminShared';

const defaultSettings = {
  generationMode: 'naked',
  bodyType: 'skinny',
  breastsSize: 'small',
  assSize: 'small',
  pussy: 'shaved',
  age: 'automatic',
};

const fallbackEnumOptions = {
  generationMode: ['naked', 'lingerie', 'bikini'],
  bodyType: ['skinny', 'average', 'athletic', 'curvy'],
  breastsSize: ['small', 'medium', 'large'],
  assSize: ['small', 'medium', 'large'],
  pussy: ['shaved', 'hairy'],
  age: ['automatic', '18'],
};

function normalizeEnumOptions(value) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const options = value.options;
    if (Array.isArray(options)) {
      return options.map(String).filter(Boolean);
    }
  }

  return null;
}

function isVideoMime(mimeType) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('video/');
}

function inferImageFromUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  const normalized = url.trim();

  if (/\/image\/upload\//i.test(normalized)) return true;
  if (/\/video\/upload\//i.test(normalized)) return false;

  const withoutQuery = normalized.split('?')[0];
  return /\.(png|jpe?g|webp|gif)$/i.test(withoutQuery);
}

function isProbablyImage(photo) {
  if (!photo) return false;
  if (typeof photo.mimeType === 'string' && photo.mimeType.toLowerCase().startsWith('image/')) return true;
  return inferImageFromUrl(photo.imageUrl);
}

function isAutomaticAgeOption(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'automatic' || normalized === 'auto';
}

function isExplicitAdultAgeOption(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized || isAutomaticAgeOption(normalized)) {
    return false;
  }
  return normalized.includes('18') || normalized.includes('adult') || normalized.includes('mature');
}

export default function GalleryUnclothySection({
  controller,
  selectedAlbum,
  photo: photoProp = null,
  album: albumProp = null,
  showPreview = true,
}) {
  const resolvedAlbum = albumProp || selectedAlbum || controller?.selectedAlbum || null;
  const selectedAlbumId = resolvedAlbum?.id ?? controller?.selectedAlbumId ?? null;

  const selectedPhotoIds = Array.isArray(controller?.selectedPhotoIds) ? controller.selectedPhotoIds : [];
  const selectedPhotoId = photoProp?.id ?? (selectedPhotoIds.length === 1 ? selectedPhotoIds[0] : null);

  const selectedPhoto = useMemo(() => {
    if (photoProp) return photoProp;
    if (!selectedPhotoId) return null;
    return Array.isArray(controller?.photos) ? controller.photos.find((photo) => photo.id === selectedPhotoId) : null;
  }, [controller?.photos, photoProp, selectedPhotoId]);

  const [status, setStatus] = useState({
    loading: true,
    enabled: false,
    configured: false,
    credits: null,
    settingsEnums: {},
    warnings: [],
  });
  const [settings, setSettings] = useState(defaultSettings);
  const [confirmed, setConfirmed] = useState(false);
  const [autoRefreshedAt, setAutoRefreshedAt] = useState(null);

  const queue = useUnclothyTasksStore((state) => state.queue);
  const active = useUnclothyTasksStore((state) => state.active);
  const enqueue = useUnclothyTasksStore((state) => state.enqueue);
  const clearQueue = useUnclothyTasksStore((state) => state.clearQueue);
  const startRunner = useUnclothyTasksStore((state) => state.startRunner);
  const stopTrackingActive = useUnclothyTasksStore((state) => state.stopTrackingActive);
  const lastCompletedAt = useUnclothyTasksStore((state) => state.lastCompletedAt);
  const lastCompletedAlbumId = useUnclothyTasksStore((state) => state.lastCompletedAlbumId);
  const lastCompletedAtRef = useRef(lastCompletedAt);

  const loadStatus = useCallback(async () => {
    setStatus((current) => ({ ...current, loading: true }));
    try {
      const data = await fetchJson('/api/admin/integrations/unclothy', { method: 'GET' });
      setStatus({
        loading: false,
        enabled: data.enabled === true,
        configured: data.configured === true,
        credits: typeof data.credits === 'number' ? data.credits : null,
        settingsEnums: data.settingsEnums && typeof data.settingsEnums === 'object' ? data.settingsEnums : {},
        warnings: Array.isArray(data.warnings) ? data.warnings.map(String).filter(Boolean) : [],
      });
    } catch (error) {
      toast.error(error?.message || 'Unable to load Unclothy status.');
      setStatus({ loading: false, enabled: false, configured: false, credits: null, settingsEnums: {}, warnings: [] });
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!selectedAlbumId) {
      return;
    }
    if (!lastCompletedAt || lastCompletedAt === lastCompletedAtRef.current) {
      return;
    }
    lastCompletedAtRef.current = lastCompletedAt;
    if (lastCompletedAlbumId !== selectedAlbumId) {
      return;
    }

    if (typeof controller?.loadPhotos === 'function') {
      void controller.loadPhotos(selectedAlbumId, controller?.sortMode);
    }
    if (typeof controller?.loadAlbums === 'function') {
      void controller.loadAlbums();
    }
    setAutoRefreshedAt(Date.now());
    void loadStatus();
  }, [controller, lastCompletedAlbumId, lastCompletedAt, loadStatus, selectedAlbumId]);

  const enumOptionsByKey = useMemo(() => {
    const result = {};
    const enums = status.settingsEnums && typeof status.settingsEnums === 'object' ? status.settingsEnums : {};
    for (const [key, value] of Object.entries(enums)) {
      const normalized = normalizeEnumOptions(value);
      if (normalized && normalized.length > 0) {
        result[key] = normalized;
      }
    }
    return result;
  }, [status.settingsEnums]);

  const getOptions = useCallback(
    (key) => {
      const fromProvider = enumOptionsByKey[key];
      if (Array.isArray(fromProvider) && fromProvider.length > 0) {
        if (key === 'age') {
          const allowed = fromProvider.filter((option) => isAutomaticAgeOption(option) || isExplicitAdultAgeOption(option));
          return allowed.length > 0 ? allowed : fallbackEnumOptions.age;
        }
        return fromProvider;
      }

      if (key === 'age') {
        const fallback = fallbackEnumOptions.age || [];
        const allowed = fallback.filter((option) => isAutomaticAgeOption(option) || isExplicitAdultAgeOption(option));
        return allowed.length > 0 ? allowed : fallback;
      }

      return fallbackEnumOptions[key] || [];
    },
    [enumOptionsByKey],
  );

  const normalizeSettings = useCallback(
    (candidate) => {
      const merged = {
        ...defaultSettings,
        ...(candidate && typeof candidate === 'object' ? candidate : {}),
      };

      const normalized = { ...merged };
      for (const key of Object.keys(defaultSettings)) {
        const options = getOptions(key);
        if (!Array.isArray(options) || options.length === 0) {
          continue;
        }

        const value = String(normalized[key] ?? '').trim();
        if (!value || !options.includes(value)) {
          normalized[key] = options[0];
        }
      }

      return normalized;
    },
    [getOptions],
  );

  useEffect(() => {
    if (!selectedAlbumId) {
      return;
    }

    setSettings(defaultSettings);
    setConfirmed(false);

    const controllerAbort = new AbortController();
    fetchJson(`/api/admin/integrations/unclothy/album-defaults?albumId=${encodeURIComponent(selectedAlbumId)}`, {
      method: 'GET',
      signal: controllerAbort.signal,
    })
      .then((data) => {
        if (!data?.settings) {
          return;
        }
        setSettings(normalizeSettings(data.settings));
      })
      .catch(() => {
        // ignore
      });

    return () => controllerAbort.abort();
  }, [normalizeSettings, selectedAlbumId]);

  const selectionProblem = useMemo(() => {
    if (!selectedAlbumId) return 'Select an album first.';
    if (!selectedPhotoId) return 'Select exactly 1 image from the album grid.';
    if (!selectedPhoto) return 'Selected item is not available yet. Try again.';
    if (isVideoMime(selectedPhoto.mimeType)) {
      return `Selected media must be an image (not video). (${selectedPhoto.mimeType})`;
    }
    if (!isProbablyImage(selectedPhoto)) {
      return `Selected media must be an image. (${selectedPhoto.mimeType || 'unknown type'})`;
    }
    return null;
  }, [selectedAlbumId, selectedPhoto, selectedPhotoId]);

  const canEnqueue = status.enabled && status.configured && confirmed && !selectionProblem;

  const percent = typeof active?.percent === 'number' ? Math.max(0, Math.min(100, active.percent)) : 0;
  const phaseLabel = active?.phase
    ? active.phase === 'creating'
      ? 'Creating'
      : active.phase === 'processing'
        ? 'Processing'
        : active.phase === 'ingesting'
          ? 'Saving'
          : active.phase === 'done'
            ? 'Done'
            : active.phase === 'error'
              ? 'Error'
              : 'Queued'
    : null;

  const isActiveForSelection =
    Boolean(active?.albumId) &&
    Boolean(active?.sourcePhotoId) &&
    active.albumId === selectedAlbumId &&
    active.sourcePhotoId === selectedPhotoId;

  const disableInputs = Boolean(active && active.phase === 'ingesting' && isActiveForSelection);

  const basicFields = useMemo(() => ['generationMode', 'bodyType'], []);
  const advancedFields = useMemo(() => ['age', 'breastsSize', 'assSize', 'pussy'], []);

  const handleEnqueue = () => {
    if (!canEnqueue) {
      toast.error(selectionProblem || 'Complete all required fields first.');
      return;
    }

    try {
      void fetchJson('/api/admin/integrations/unclothy/album-defaults', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          albumId: selectedAlbumId,
          settings,
        }),
      });
    } catch {
      // ignore
    }

    enqueue({
      albumId: selectedAlbumId,
      sourcePhotoId: selectedPhotoId,
      settingsSnapshot: {
        ...settings,
      },
    });
    startRunner();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-tight text-slate-950 dark:text-slate-50">Generate</p>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Queue a generation job for the selected image. It keeps running while you navigate.
          </p>
        </div>

        <button
          type="button"
          className={ghostButtonStyles}
          onClick={() => {
            if (active?.phase === 'error') {
              stopTrackingActive();
            }
            loadStatus();
          }}
          disabled={status.loading}
        >
          {status.loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {showPreview && selectedPhoto ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
            <MediaPreview
              url={selectedPhoto.imageUrl}
              mimeType={selectedPhoto.mimeType}
              sourceType={selectedPhoto.sourceType}
              sourceId={selectedPhoto.sourceId}
              alt={selectedPhoto.caption || `Media ${selectedPhoto.id}`}
              className="h-full w-full object-contain"
              controls={false}
            />
          </div>
          <p className="mt-3 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {selectedPhoto.caption || `media ${selectedPhoto.id}`}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resolvedAlbum?.name}</p>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Quick info</p>
        <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400">Status</span>
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {!status.enabled ? 'Disabled' : !status.configured ? 'Needs setup' : 'Ready'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 dark:text-slate-400">Credits</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-50">
              <Coins className="size-4" />
              {status.credits ?? '—'}
            </span>
          </div>
        </div>

        {selectionProblem ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-200">{selectionProblem}</p>
        ) : null}

        {active ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold">
                {phaseLabel}
                {isActiveForSelection ? '' : ' (background)'}
              </span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-600 transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-200">
              {active.statusText || 'Working…'}
              {active.providerStatus ? (
                <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">({active.providerStatus})</span>
              ) : null}
            </p>
          </div>
        ) : queue.length > 0 ? (
          <p className="mt-4 text-sm text-slate-700 dark:text-slate-200">{queue.length} task(s) queued.</p>
        ) : null}

        {active?.phase === 'error' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={ghostButtonStyles} onClick={stopTrackingActive}>
              Dismiss
            </button>
            <button
              type="button"
              className={ghostButtonStyles}
              disabled={!canEnqueue || disableInputs}
              onClick={() => {
                stopTrackingActive();
                handleEnqueue();
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {status.warnings.length > 0 ? (
          <div className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-200">
            {status.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {autoRefreshedAt ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Album refreshed after background save.</p>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Basic settings</p>
        <div className="mt-4 space-y-4">
          {basicFields.map((key) => {
            const options = getOptions(key);
            const value = settings[key] ?? '';
            const label = key === 'generationMode' ? 'Generation mode' : key === 'bodyType' ? 'Body type' : key;

            return (
              <label key={key} className="block text-sm font-medium text-slate-900 dark:text-slate-50">
                <span className="mb-1.5 block">{label}</span>
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-50"
                  value={String(value)}
                  onChange={(event) => setSettings((previous) => ({ ...previous, [key]: event.target.value }))}
                  disabled={disableInputs}
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      </div>

      <details className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-50">Advanced settings</summary>
        <div className="mt-4 space-y-4">
          {advancedFields.map((key) => {
            const options = getOptions(key);
            const value = settings[key] ?? '';
            const label =
              key === 'age'
                ? 'Age'
                : key === 'breastsSize'
                ? 'Breast size'
                : key === 'assSize'
                  ? 'Ass size'
                  : key === 'pussy'
                    ? 'Pussy'
                    : key;

            return (
              <label key={key} className="block text-sm font-medium text-slate-900 dark:text-slate-50">
                <span className="mb-1.5 block">{label}</span>
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-50"
                  value={String(value)}
                  onChange={(event) => setSettings((previous) => ({ ...previous, [key]: event.target.value }))}
                  disabled={disableInputs}
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      </details>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            disabled={disableInputs}
          />
          <span>
            I confirm this request is for <span className="font-semibold">consensual adult content (18+)</span>. No minors.
            No non-consensual imagery.
          </span>
        </label>
      </div>

      <button
        type="button"
        className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-50 dark:text-slate-900"
        disabled={!canEnqueue || disableInputs}
        onClick={handleEnqueue}
      >
        {queue.length > 0 || active ? 'Add to queue' : 'Generate'}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {queue.length > 0 ? (
          <button type="button" className={ghostButtonStyles} onClick={clearQueue} disabled={disableInputs}>
            Clear queue
          </button>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">Age enforced to explicit 18+.</span>
        )}
        <button
          type="button"
          className={ghostButtonStyles}
          disabled={disableInputs}
          onClick={() => setSettings(defaultSettings)}
        >
          Reset settings
        </button>
      </div>
    </div>
  );
}

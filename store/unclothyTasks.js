'use client';

import { useSyncExternalStore } from 'react';

const storageKey = 'unclothy:tasks:v1';
const listeners = new Set();

let hydrated = false;
let running = false;
let runAbortController = null;
let activeAbortController = null;

let state = {
  queue: [],
  active: null,
  lastCompletedAt: null,
  lastCompletedAlbumId: null,
};

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const persist = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        queue: state.queue,
        active: state.active,
        lastCompletedAt: state.lastCompletedAt,
        lastCompletedAlbumId: state.lastCompletedAlbumId,
      }),
    );
  } catch {
    // ignore
  }
};

const setState = (patch) => {
  state = { ...state, ...patch };
  persist();
  emitChange();
};

const setActive = (patch) => {
  const next = patch ? { ...(state.active ?? {}), ...patch } : null;
  state = { ...state, active: next };
  persist();
  emitChange();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => ({
  queue: state.queue,
  active: state.active,
  lastCompletedAt: state.lastCompletedAt,
  lastCompletedAlbumId: state.lastCompletedAlbumId,
  hydrateFromLocalStorage,
  enqueue,
  clearQueue,
  cancelActive,
  retryActive,
  stopTrackingActive,
  startRunner,
});

export const useUnclothyTasksStore = (selector = (value) => value) =>
  useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));

useUnclothyTasksStore.getState = getSnapshot;

export function hydrateFromLocalStorage() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const nextQueue = Array.isArray(parsed?.queue) ? parsed.queue : [];
    const nextActive = parsed?.active && typeof parsed.active === 'object' ? parsed.active : null;
    const lastCompletedAt = typeof parsed?.lastCompletedAt === 'number' ? parsed.lastCompletedAt : null;
    const lastCompletedAlbumId = typeof parsed?.lastCompletedAlbumId === 'number' ? parsed.lastCompletedAlbumId : null;
    state = { queue: nextQueue, active: nextActive, lastCompletedAt, lastCompletedAlbumId };
    emitChange();
  } catch {
    // ignore
  }
}

export function enqueue({ albumId, sourcePhotoId, settingsSnapshot }) {
  if (!albumId || !sourcePhotoId) return;
  const next = {
    albumId,
    sourcePhotoId,
    settingsSnapshot: settingsSnapshot && typeof settingsSnapshot === 'object' ? settingsSnapshot : {},
    createdAt: Date.now(),
  };
  setState({ queue: [...state.queue, next] });
  startRunner();
}

export function clearQueue() {
  setState({ queue: [] });
}

export function stopTrackingActive() {
  // This does NOT cancel the upstream task; it only stops local tracking.
  try {
    activeAbortController?.abort();
  } catch {
    // ignore
  }
  activeAbortController = null;

  try {
    runAbortController?.abort();
  } catch {
    // ignore
  }
  runAbortController = null;
  setActive(null);
  running = false;
}

export function cancelActive() {
  try {
    activeAbortController?.abort();
  } catch {
    // ignore
  }
  activeAbortController = null;

  try {
    runAbortController?.abort();
  } catch {
    // ignore
  }
  runAbortController = null;

  setActive(null);
  running = false;
}

export function retryActive() {
  hydrateFromLocalStorage();
  const active = state.active;
  if (!active || active.phase !== 'error') return;

  const failedPhase = typeof active.failedPhase === 'string' ? active.failedPhase : null;
  const resumePhase = failedPhase && failedPhase !== 'error' ? failedPhase : 'processing';

  // If we never got a task id (failed during creation), we can't resume provider polling.
  if (!active.taskId) {
    const { albumId, sourcePhotoId, settingsSnapshot } = active;
    setActive(null);
    running = false;
    enqueue({ albumId, sourcePhotoId, settingsSnapshot });
    return;
  }

  if (running) return;

  setActive({
    phase: resumePhase,
    percent:
      resumePhase === 'ingesting'
        ? Math.max(92, Number.isFinite(active.percent) ? active.percent : 92)
        : Math.max(15, Number.isFinite(active.percent) ? active.percent : 15),
    statusText: resumePhase === 'ingesting' ? nextStatusText('ingesting', 0) : 'Processing…',
    errorMessage: null,
  });

  running = true;
  runAbortController = new AbortController();
  void runnerLoop();
}

const createAbortError = () => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const timeoutId = setTimeout(() => {
      if (signal && onAbort) {
        signal.removeEventListener('abort', onAbort);
      }
      resolve();
    }, ms);

    const onAbort = signal
      ? () => {
          clearTimeout(timeoutId);
          signal.removeEventListener('abort', onAbort);
          reject(createAbortError());
        }
      : null;

    if (signal && onAbort) {
      signal.addEventListener('abort', onAbort);
    }
  });

function isProviderFailedStatus(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes('fail') || normalized.includes('error');
}

function nextStatusText(phase, tick) {
  if (phase === 'creating') return 'Creating task…';
  if (phase === 'ingesting') return 'Saving to album…';
  if (phase !== 'processing') return '';
  const messages = ['Uploading image…', 'Processing…', 'Working on details…', 'Almost done…'];
  return messages[tick % messages.length];
}

function bumpPercent(current, { min = 0, max = 100, step = 3 } = {}) {
  const base = Number.isFinite(current) ? current : min;
  return Math.max(min, Math.min(max, base + step));
}

async function runnerLoop() {
  let statusTick = 0;

  while (running) {
    hydrateFromLocalStorage();

    if (state.active?.phase === 'error') {
      running = false;
      runAbortController = null;
      activeAbortController = null;
      return;
    }

    if (!state.active) {
      if (state.queue.length === 0) {
        running = false;
        runAbortController = null;
        activeAbortController = null;
        return;
      }

      const [next, ...rest] = state.queue;
      setState({ queue: rest });
      setActive({
        taskId: null,
        phase: 'creating',
        percent: 7,
        statusText: 'Creating task…',
        providerStatus: null,
        albumId: next.albumId,
        sourcePhotoId: next.sourcePhotoId,
        settingsSnapshot: next.settingsSnapshot,
        startedAt: Date.now(),
        errorMessage: null,
      });
    }

    const active = state.active;
    if (!active) {
      continue;
    }

    try {
      if (active.phase === 'creating') {
        activeAbortController = new AbortController();
        const response = await fetch('/api/admin/integrations/unclothy/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumId: active.albumId,
            sourcePhotoId: active.sourcePhotoId,
            confirmedAdultConsent: true,
            settings: active.settingsSnapshot ?? {},
          }),
          signal: activeAbortController.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || `Create task failed (${response.status}).`);
        }

        const taskId = payload?.taskId;
        if (!taskId) {
          throw new Error('Unclothy task id missing from response.');
        }

        setActive({
          taskId,
          phase: 'processing',
          percent: 15,
          statusText: 'Processing…',
          providerStatus: null,
        });
      } else if (active.phase === 'processing') {
        statusTick += 1;
        setActive({
          percent: bumpPercent(active.percent, { min: 15, max: 90, step: active.percent < 50 ? 6 : active.percent < 75 ? 4 : 2 }),
          statusText: nextStatusText('processing', statusTick),
        });

        activeAbortController = new AbortController();
        const response = await fetch(`/api/admin/integrations/unclothy/tasks/${encodeURIComponent(active.taskId)}`, {
          method: 'GET',
          signal: activeAbortController.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || `Task status failed (${response.status}).`);
        }

        const providerStatus = payload?.status || 'Unknown';
        const isComplete = Boolean(payload?.isComplete);
        setActive({ providerStatus });

        if (isProviderFailedStatus(providerStatus)) {
          throw new Error(`Unclothy failed (${providerStatus}).`);
        }

        if (isComplete) {
          setActive({ phase: 'ingesting', percent: 92, statusText: nextStatusText('ingesting', statusTick) });
        } else {
          await sleep(Math.min(5000, 1500 + statusTick * 250), runAbortController?.signal);
        }
      } else if (active.phase === 'ingesting') {
        activeAbortController = new AbortController();
        const response = await fetch(
          `/api/admin/integrations/unclothy/tasks/${encodeURIComponent(active.taskId)}/ingest`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              albumId: active.albumId,
              sourcePhotoId: active.sourcePhotoId,
              confirmedAdultConsent: true,
            }),
            signal: activeAbortController.signal,
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errorCode = payload?.errorCode || payload?.code;
          const isNotReady =
            response.status === 409 && (errorCode === 'UNCLOTHY_NOT_READY' || /not\s+completed/i.test(payload?.error || ''));

          if (isNotReady) {
            const retries = Number.isFinite(active.ingestRetries) ? active.ingestRetries : 0;
            if (retries >= 8) {
              throw new Error(payload?.error || payload?.message || `Ingest failed (${response.status}).`);
            }

            setActive({
              phase: 'processing',
              ingestRetries: retries + 1,
              percent: Math.max(75, Math.min(90, active.percent ?? 85)),
              statusText: 'Finalizing outputâ€¦',
            });
            await sleep(Math.min(5000, 1200 + retries * 400), runAbortController?.signal);
            continue;
          }

          throw new Error(payload?.error || payload?.message || `Ingest failed (${response.status}).`);
        }

        setActive({ phase: 'done', percent: 100, statusText: 'Saved.', completedAt: Date.now() });
        setState({
          lastCompletedAt: Date.now(),
          lastCompletedAlbumId: active.albumId,
        });
        await sleep(1200, runAbortController?.signal);
        setActive(null);
      } else if (active.phase === 'done') {
        setActive(null);
      } else {
        await sleep(300, runAbortController?.signal);
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        activeAbortController = null;
        runAbortController = null;
        setActive(null);
        running = false;
        return;
      }
      const message = error instanceof Error ? error.message : 'Unclothy task failed.';
      setActive({ phase: 'error', failedPhase: active?.phase ?? null, errorMessage: message, statusText: message });
      running = false;
      activeAbortController = null;
      runAbortController = null;
      return;
    }
  }

  runAbortController = null;
  activeAbortController = null;
}

export function startRunner() {
  hydrateFromLocalStorage();
  if (running) return;
  running = true;
  runAbortController = new AbortController();
  void runnerLoop();
}

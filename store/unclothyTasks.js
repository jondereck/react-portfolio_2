'use client';

import { useSyncExternalStore } from 'react';

const storageKey = 'unclothy:tasks:v1';
const listeners = new Set();

let hydrated = false;
let running = false;

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
  setActive(null);
  running = false;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      return;
    }

    if (!state.active) {
      if (state.queue.length === 0) {
        running = false;
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
        const response = await fetch('/api/admin/integrations/unclothy/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            albumId: active.albumId,
            sourcePhotoId: active.sourcePhotoId,
            confirmedAdultConsent: true,
            settings: active.settingsSnapshot ?? {},
          }),
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

        const response = await fetch(`/api/admin/integrations/unclothy/tasks/${encodeURIComponent(active.taskId)}`, {
          method: 'GET',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || `Task status failed (${response.status}).`);
        }

        const providerStatus = payload?.status || 'Unknown';
        const isComplete = Boolean(payload?.isComplete);
        setActive({ providerStatus });

        if (isComplete) {
          setActive({ phase: 'ingesting', percent: 92, statusText: nextStatusText('ingesting', statusTick) });
        } else {
          await sleep(Math.min(5000, 1500 + statusTick * 250));
        }
      } else if (active.phase === 'ingesting') {
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
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || payload?.message || `Ingest failed (${response.status}).`);
        }

        setActive({ phase: 'done', percent: 100, statusText: 'Saved.', completedAt: Date.now() });
        setState({
          lastCompletedAt: Date.now(),
          lastCompletedAlbumId: active.albumId,
        });
        await sleep(1200);
        setActive(null);
      } else if (active.phase === 'done') {
        setActive(null);
      } else {
        await sleep(300);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unclothy task failed.';
      setActive({ phase: 'error', errorMessage: message, statusText: message });
      running = false;
      return;
    }
  }
}

export function startRunner() {
  hydrateFromLocalStorage();
  if (running) return;
  running = true;
  void runnerLoop();
}

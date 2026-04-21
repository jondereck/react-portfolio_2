'use client';

import { useSyncExternalStore } from 'react';

const listeners = new Set();
const pollIntervalMs = 3500;

let hydrated = false;
let polling = false;
let pollTimer = null;
let refreshInFlight = false;
let knownCompletedTaskIds = new Set();

let state = {
  tasks: [],
  queue: [],
  activeTasks: [],
  failedTasks: [],
  active: null,
  lastCompletedAt: null,
  lastCompletedAlbumId: null,
  loading: false,
  error: null,
};

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

function normalizeTask(task) {
  if (!task || typeof task !== 'object') return null;
  return {
    ...task,
    id: typeof task.id === 'string' ? task.id : task.queueTaskId,
    queueTaskId: typeof task.queueTaskId === 'string' ? task.queueTaskId : task.id,
    settingsSnapshot: task.settingsSnapshot && typeof task.settingsSnapshot === 'object' ? task.settingsSnapshot : {},
  };
}

function deriveTaskState(tasks) {
  const normalized = Array.isArray(tasks) ? tasks.map(normalizeTask).filter(Boolean) : [];
  const queue = normalized.filter((task) => task.status === 'queued' || task.phase === 'queued');
  const activeTasks = normalized.filter((task) => task.status === 'running');
  const failedTasks = normalized.filter((task) => task.status === 'failed' || task.phase === 'error');
  const completedTasks = normalized.filter((task) => task.status === 'completed' || task.phase === 'done');

  for (const task of completedTasks) {
    if (!task.id || knownCompletedTaskIds.has(task.id)) {
      continue;
    }
    knownCompletedTaskIds.add(task.id);
    state.lastCompletedAt = task.completedAt || Date.now();
    state.lastCompletedAlbumId = typeof task.albumId === 'number' ? task.albumId : null;
  }

  return {
    tasks: normalized,
    queue,
    activeTasks,
    failedTasks,
    active: activeTasks[0] || failedTasks[0] || null,
  };
}

const setState = (patch) => {
  state = { ...state, ...patch };
  emitChange();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => ({
  ...state,
  hydrateFromLocalStorage,
  enqueue,
  clearQueue,
  cancelActive,
  cancelTask,
  retryActive,
  retryTask,
  stopTrackingActive,
  startRunner,
  refreshTasks,
});

export const useUnclothyTasksStore = (selector = (value) => value) =>
  useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));

useUnclothyTasksStore.getState = getSnapshot;

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || fallbackMessage);
  }
  return payload;
}

function getResult(payload) {
  return payload?.result && typeof payload.result === 'object' ? payload.result : payload;
}

export function hydrateFromLocalStorage() {
  hydrated = true;
}

export async function refreshTasks() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  setState({ loading: true, error: null });
  try {
    const response = await fetch('/api/admin/integrations/unclothy/tasks', { method: 'GET', cache: 'no-store' });
    const payload = await parseResponse(response, 'Unable to load Unclothy tasks.');
    const result = getResult(payload);
    const derived = deriveTaskState(Array.isArray(result?.tasks) ? result.tasks : []);
    setState({ ...derived, loading: false, error: null });
  } catch (error) {
    setState({ loading: false, error: error instanceof Error ? error.message : 'Unable to load Unclothy tasks.' });
  } finally {
    refreshInFlight = false;
  }
}

export async function enqueue({ albumId, sourcePhotoId, settingsSnapshot }) {
  if (!albumId || !sourcePhotoId) return { added: false };
  hydrateFromLocalStorage();

  const response = await fetch('/api/admin/integrations/unclothy/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      albumId,
      sourcePhotoId,
      confirmedAdultConsent: true,
      settings: settingsSnapshot ?? {},
    }),
  });
  await parseResponse(response, 'Unable to queue Unclothy task.');
  await refreshTasks();
  startRunner();
  return { added: true };
}

export async function cancelTask(taskId) {
  if (!taskId) return;
  const response = await fetch(`/api/admin/integrations/unclothy/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cancel' }),
  });
  await parseResponse(response, 'Unable to cancel Unclothy task.');
  await refreshTasks();
}

export async function retryTask(taskId) {
  if (!taskId) return;
  const response = await fetch(`/api/admin/integrations/unclothy/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'retry' }),
  });
  await parseResponse(response, 'Unable to retry Unclothy task.');
  await refreshTasks();
  startRunner();
}

export async function clearQueue() {
  const queued = [...state.queue];
  await Promise.all(queued.map((task) => cancelTask(task.id || task.queueTaskId).catch(() => null)));
  await refreshTasks();
}

export function stopTrackingActive() {
  const failed = state.failedTasks[0];
  if (failed?.id) {
    void cancelTask(failed.id);
  }
}

export function cancelActive() {
  const active = state.active;
  if (active?.id) {
    void cancelTask(active.id);
  }
}

export function retryActive() {
  const failed = state.failedTasks[0] || (state.active?.status === 'failed' ? state.active : null);
  if (failed?.id) {
    void retryTask(failed.id);
  }
}

export function startRunner() {
  hydrateFromLocalStorage();
  if (polling) return;
  polling = true;
  void refreshTasks();
  pollTimer = window.setInterval(() => {
    void refreshTasks();
  }, pollIntervalMs);
}

export function stopRunner() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
  }
  pollTimer = null;
  polling = false;
}

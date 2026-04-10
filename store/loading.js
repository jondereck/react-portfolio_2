'use client';

import { useSyncExternalStore } from 'react';

let loading = false;
const listeners = new Set();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const setLoading = (value) => {
  loading = Boolean(value);
  emitChange();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => ({
  loading,
  setLoading,
});

export const useLoadingStore = (selector = (state) => state) => useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));

useLoadingStore.getState = getSnapshot;

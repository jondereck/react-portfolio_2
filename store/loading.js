'use client';

import { useSyncExternalStore } from 'react';

const defaultMessage = 'Loading the next scene';
let activeRequests = 0;
let message = defaultMessage;
const listeners = new Set();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const setMessage = (value) => {
  if (typeof value === 'string' && value.trim()) {
    message = value.trim();
  } else if (activeRequests === 0) {
    message = defaultMessage;
  }

  emitChange();
};

const startLoading = (nextMessage) => {
  activeRequests += 1;
  if (typeof nextMessage === 'string' && nextMessage.trim()) {
    message = nextMessage.trim();
  }

  emitChange();
};

const stopLoading = () => {
  if (activeRequests === 0) {
    return;
  }

  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    message = defaultMessage;
  }

  emitChange();
};

const setLoading = (value, options = {}) => {
  if (value) {
    startLoading(typeof options === 'string' ? options : options?.message);
    return;
  }

  stopLoading();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => ({
  loading: activeRequests > 0,
  activeRequests,
  message,
  setMessage,
  startLoading,
  stopLoading,
  setLoading,
});

export const useLoadingStore = (selector = (state) => state) => useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));

useLoadingStore.getState = getSnapshot;

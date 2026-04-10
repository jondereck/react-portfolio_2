'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Key = string;
type Fetcher<T> = (key: Key) => Promise<T>;

type StoreRecord<T> = {
  data?: T;
  error?: unknown;
  isLoading: boolean;
  fetcher?: Fetcher<T>;
};

const store = new Map<Key, StoreRecord<unknown>>();
const listeners = new Map<Key, Set<() => void>>();

const notify = (key: Key) => {
  listeners.get(key)?.forEach((listener) => listener());
};

const ensureRecord = <T,>(key: Key): StoreRecord<T> => {
  const existing = store.get(key);
  if (existing) {
    return existing as StoreRecord<T>;
  }

  const next: StoreRecord<T> = { isLoading: false };
  store.set(key, next as StoreRecord<unknown>);
  return next;
};

const runFetch = async <T,>(key: Key) => {
  const record = ensureRecord<T>(key);
  if (!record.fetcher) {
    return;
  }

  record.isLoading = true;
  notify(key);

  try {
    const data = await record.fetcher(key);
    record.data = data;
    record.error = undefined;
  } catch (error) {
    record.error = error;
  } finally {
    record.isLoading = false;
    notify(key);
  }
};

export async function mutate(key: Key): Promise<void> {
  await runFetch(key);
}

export default function useSWR<T>(key: Key, fetcher: Fetcher<T>) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const set = listeners.get(key) ?? new Set<() => void>();
    const listener = () => setTick((value) => value + 1);
    set.add(listener);
    listeners.set(key, set);

    return () => {
      const current = listeners.get(key);
      if (!current) {
        return;
      }
      current.delete(listener);
      if (current.size === 0) {
        listeners.delete(key);
      }
    };
  }, [key]);

  const record = useMemo(() => {
    const current = ensureRecord<T>(key);
    current.fetcher = fetcher;
    return current;
  }, [fetcher, key]);

  useEffect(() => {
    if (record.data === undefined && !record.isLoading) {
      void runFetch<T>(key);
    }
  }, [key, record]);

  const boundMutate = useCallback(async () => {
    await mutate(key);
  }, [key]);

  return {
    data: record.data,
    error: record.error,
    isLoading: record.isLoading,
    mutate: boundMutate,
  };
}

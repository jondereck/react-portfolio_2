'use client';

import { useCallback, useEffect, useState } from 'react';

type Fetcher<T> = (key: string) => Promise<T>;
type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();
const fetchers = new Map<string, Fetcher<unknown>>();

const subscribe = (key: string, listener: Listener) => {
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => {
    const current = listeners.get(key);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(key);
  };
};

const notify = (key: string) => {
  const set = listeners.get(key);
  if (!set) return;
  for (const listener of set) {
    listener();
  }
};

export async function mutate(key: string): Promise<void> {
  notify(key);
}

export default function useSWR<T>(key: string, fetcher: Fetcher<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  const runFetch = useCallback(async () => {
    setIsValidating(true);
    try {
      const result = await fetcher(key);
      setData(result);
      setError(undefined);
    } catch (fetchError) {
      setError(fetchError);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [fetcher, key]);

  useEffect(() => {
    fetchers.set(key, fetcher as Fetcher<unknown>);
    runFetch();
    return subscribe(key, runFetch);
  }, [fetcher, key, runFetch]);

  return { data, error, isLoading, isValidating };
}

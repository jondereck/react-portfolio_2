'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { handleRequest } from '@/lib/handleRequest';
import { notifyRealtimeUpdate, revalidatePublicData } from '@/lib/realtime';

const defaultFormState = (fields) =>
  fields.reduce((state, field) => {
    if (field.type === 'checkbox') {
      state[field.name] = false;
      return state;
    }

    if (field.type === 'string-array') {
      state[field.name] = [];
      return state;
    }

    state[field.name] = '';
    return state;
  }, {});

const buildPayload = (fields, formState) => {
  const payload = {};

  for (const field of fields) {
    const rawValue = formState[field.name];

    if (field.serialize) {
      payload[field.name] = field.serialize(rawValue);
      continue;
    }

    if (field.type === 'number') {
      payload[field.name] = rawValue === '' ? undefined : Number(rawValue);
      continue;
    }

    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(rawValue);
      continue;
    }

    if (field.type === 'string-array') {
      payload[field.name] = Array.isArray(rawValue)
        ? rawValue.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
        : [];
      continue;
    }

    if (rawValue === '') {
      payload[field.name] = field.required === false ? undefined : '';
      continue;
    }

    payload[field.name] = rawValue;
  }

  return payload;
};

const buildRequestConfig = (fields, formState) => {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(fields, formState)),
  };
};

const formatForForm = (fields, item) =>
  fields.reduce((state, field) => {
    const value = item?.[field.name];

    if (field.deserialize) {
      state[field.name] = field.deserialize(value);
      return state;
    }

    if (field.type === 'number') {
      state[field.name] = value ?? '';
      return state;
    }

    if (field.type === 'checkbox') {
      state[field.name] = Boolean(value);
      return state;
    }

    if (field.type === 'string-array') {
      state[field.name] = Array.isArray(value) ? value.map((item) => String(item)) : [];
      return state;
    }

    state[field.name] = value ?? '';
    return state;
  }, defaultFormState(fields));

const fetcher = (url, adminKey) =>
  fetch(url, {
    cache: 'no-store',
    headers: adminKey ? { 'x-admin-key': adminKey } : undefined,
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Unable to load ${url}`);
    }

    return response.json();
  });

export function useAdminData({ endpoint, title, fields, adminKey }) {
  const [formState, setFormState] = useState(() => defaultFormState(fields));
  const [editingId, setEditingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const { data, error: swrError, isLoading, mutate: refreshItems } = useSWR(endpoint, (url) => fetcher(url, adminKey));
  const items = Array.isArray(data) ? data : [];

  useEffect(() => {
    if (!swrError) {
      return;
    }

    const message = swrError instanceof Error ? swrError.message : `Unable to load ${title}`;
    setError(message);
    toast.error(`Unable to load ${title}`, { description: message });
  }, [swrError, title]);

  const loadItems = useCallback(async () => {
    await refreshItems();
  }, [refreshItems]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setEditingItem(null);
    setFormState(defaultFormState(fields));
    setDialogOpen(false);
    setError('');
  }, [fields]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setEditingItem(null);
    setFormState(defaultFormState(fields));
    setDialogOpen(true);
    setError('');
  }, [fields]);

  const openEdit = useCallback(
    async (id) => {
      setError('');
      try {
        const item = await handleRequest(() =>
          fetch(`${endpoint}/${id}`, {
            cache: 'no-store',
            headers: adminKey ? { 'x-admin-key': adminKey } : undefined,
          }),
        );

        setEditingId(item.id);
        setEditingItem(item);
        setFormState(formatForForm(fields, item));
        setDialogOpen(true);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : `Unable to load ${title} entry`;
        setError(message);
        toast.error(`Unable to load ${title} entry`, { description: message });
      }
    },
    [adminKey, endpoint, fields, title],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setError('');
      setSaving(true);

      const isUpdating = editingId !== null;
      const requestEndpoint = isUpdating ? `${endpoint}/${editingId}` : endpoint;
      const requestConfig = buildRequestConfig(fields, formState);

      try {
        const requestPromise = handleRequest(() =>
          fetch(requestEndpoint, {
            method: isUpdating ? 'PUT' : 'POST',
            headers: {
              ...requestConfig.headers,
              ...(adminKey ? { 'x-admin-key': adminKey } : {}),
            },
            body: requestConfig.body,
          }),
        );

        toast.promise(requestPromise, {
          loading: `Saving ${title.toLowerCase()}...`,
          success: `${title} ${isUpdating ? 'updated' : 'created'}.`,
          error: `Unable to save ${title}`,
        });

        await requestPromise;
        await refreshItems();
        await revalidatePublicData();
        notifyRealtimeUpdate();
        resetForm();
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : `Unable to save ${title}`;
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    [adminKey, editingId, endpoint, fields, formState, refreshItems, resetForm, title],
  );

  const handleDelete = useCallback(
    async (id) => {
      setError('');
      setDeletingId(id);

      try {
        const requestPromise = handleRequest(() =>
          fetch(endpoint, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(adminKey ? { 'x-admin-key': adminKey } : {}),
            },
            body: JSON.stringify({ id }),
          }),
        );

        toast.promise(requestPromise, {
          loading: `Deleting ${title.toLowerCase()}...`,
          success: `${title} entry deleted.`,
          error: `Unable to delete ${title}`,
        });

        await requestPromise;
        await refreshItems();
        await revalidatePublicData();
        notifyRealtimeUpdate();

        if (editingId === id) {
          resetForm();
        }
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : `Unable to delete ${title}`;
        setError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [adminKey, editingId, endpoint, refreshItems, resetForm, title],
  );

  return {
    items,
    loading: isLoading,
    saving,
    deletingId,
    editingId,
    editingItem,
    dialogOpen,
    formState,
    error,
    setFormState,
    loadItems,
    setDialogOpen,
    openCreate,
    openEdit,
    resetForm,
    handleSubmit,
    handleDelete,
  };
}

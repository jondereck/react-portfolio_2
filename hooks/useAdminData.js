'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { handleRequest } from '@/lib/handleRequest';
import { useLoadingStore } from '@/store/loading';

const defaultFormState = (fields) =>
  fields.reduce((state, field) => {
    state[field.name] = field.type === 'checkbox' ? false : '';
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

    if (rawValue === '') {
      payload[field.name] = field.required === false ? undefined : '';
      continue;
    }

    payload[field.name] = rawValue;
  }

  return payload;
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

    state[field.name] = value ?? '';
    return state;
  }, defaultFormState(fields));

const adminResourceEndpoints = ['/api/projects', '/api/portfolio', '/api/certificates', '/api/experience', '/api/skills'];

export function useAdminData({ endpoint, title, fields, adminKey }) {
  const [formState, setFormState] = useState(() => defaultFormState(fields));
  const [editingId, setEditingId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const setGlobalLoading = useLoadingStore((state) => state.setLoading);

  const fetcher = useCallback(
    async (url) =>
      handleRequest(() =>
        fetch(url, {
          cache: 'no-store',
          headers: adminKey ? { 'x-admin-key': adminKey } : undefined,
        }),
      ),
    [adminKey],
  );
  const { data, error: swrError, isLoading, isValidating } = useSWR(endpoint, fetcher);
  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const loading = isLoading || isValidating;

  const loadItems = useCallback(async () => {
    setError('');
    setGlobalLoading(true);
    try {
      await mutate(endpoint);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : `Unable to load ${title}`;
      setError(message);
      toast.error(`Unable to load ${title}`, { description: message });
    } finally {
      setGlobalLoading(false);
    }
  }, [endpoint, setGlobalLoading, title]);

  useEffect(() => {
    if (!swrError) {
      return;
    }
    const message = swrError instanceof Error ? swrError.message : `Unable to load ${title}`;
    setError(message);
    toast.error(`Unable to load ${title}`, { description: message });
  }, [swrError, title]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormState(defaultFormState(fields));
    setDialogOpen(false);
    setError('');
  }, [fields]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormState(defaultFormState(fields));
    setDialogOpen(true);
    setError('');
  }, [fields]);

  const openEdit = useCallback(
    async (id) => {
      setError('');
      setGlobalLoading(true);
      try {
        const item = await handleRequest(() =>
          fetch(`${endpoint}/${id}`, {
            cache: 'no-store',
            headers: adminKey ? { 'x-admin-key': adminKey } : undefined,
          }),
        );

        setEditingId(item.id);
        setFormState(formatForForm(fields, item));
        setDialogOpen(true);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : `Unable to load ${title} entry`;
        setError(message);
        toast.error(`Unable to load ${title} entry`, { description: message });
      } finally {
        setGlobalLoading(false);
      }
    },
    [adminKey, endpoint, fields, setGlobalLoading, title],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setError('');
      setSaving(true);
      setGlobalLoading(true);

      const payload = buildPayload(fields, formState);
      const isUpdating = editingId !== null;
      const requestEndpoint = isUpdating ? `${endpoint}/${editingId}` : endpoint;

      try {
        const requestPromise = handleRequest(() =>
          fetch(requestEndpoint, {
            method: isUpdating ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(adminKey ? { 'x-admin-key': adminKey } : {}),
            },
            body: JSON.stringify(payload),
          }),
        );

        toast.promise(requestPromise, {
          loading: `Saving ${title.toLowerCase()}...`,
          success: `${title} ${isUpdating ? 'updated' : 'created'}.`,
          error: `Unable to save ${title}`,
        });

        await requestPromise;
        await Promise.all(adminResourceEndpoints.map((path) => mutate(path)));
        resetForm();
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : `Unable to save ${title}`;
        setError(message);
      } finally {
        setSaving(false);
        setGlobalLoading(false);
      }
    },
    [adminKey, editingId, endpoint, fields, formState, resetForm, setGlobalLoading, title],
  );

  const handleDelete = useCallback(
    async (id) => {
      setError('');
      setDeletingId(id);
      setGlobalLoading(true);

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
        await Promise.all(adminResourceEndpoints.map((path) => mutate(path)));

        if (editingId === id) {
          resetForm();
        }
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : `Unable to delete ${title}`;
        setError(message);
      } finally {
        setDeletingId(null);
        setGlobalLoading(false);
      }
    },
    [adminKey, editingId, endpoint, resetForm, setGlobalLoading, title],
  );

  return {
    items,
    loading,
    saving,
    deletingId,
    editingId,
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

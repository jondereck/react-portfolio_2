'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { clearFieldErrors, normalizeFormError, parseErrorResponse } from '@/lib/form-client';
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

const fetcher = (url) =>
  fetch(url, {
    cache: 'no-store',
  }).then(async (response) => {
    if (!response.ok) {
      throw await parseErrorResponse(response, `Unable to load ${url}`);
    }

    return response.json();
  });

export function useAdminData({ endpoint, title, fields }) {
  const [formState, setFormState] = useState(() => defaultFormState(fields));
  const [editingId, setEditingId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { data, error: swrError, isLoading, mutate: refreshItems } = useSWR(endpoint, fetcher);
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
    setFieldErrors({});
  }, [fields]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setEditingItem(null);
    setFormState(defaultFormState(fields));
    setDialogOpen(true);
    setError('');
    setFieldErrors({});
  }, [fields]);

  const openEdit = useCallback(
    async (id) => {
      setError('');
      setFieldErrors({});
      try {
        const item = await handleRequest(() =>
          fetch(`${endpoint}/${id}`, {
            cache: 'no-store',
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
    [endpoint, fields, title],
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setError('');
      setFieldErrors({});
      setSaving(true);

      const isUpdating = editingId !== null;
      const requestEndpoint = isUpdating ? `${endpoint}/${editingId}` : endpoint;
      const requestConfig = buildRequestConfig(fields, formState);

      try {
        const result = await handleRequest(() =>
          fetch(requestEndpoint, {
            method: isUpdating ? 'PUT' : 'POST',
            headers: requestConfig.headers,
            body: requestConfig.body,
          }),
        );
        await refreshItems();
        await revalidatePublicData();
        notifyRealtimeUpdate();
        toast.success(`${title} ${isUpdating ? 'updated' : 'created'}.`);
        resetForm();
        return result;
      } catch (requestError) {
        const normalized = normalizeFormError(requestError, `Unable to save ${title}`);
        setError(normalized.formError);
        setFieldErrors(normalized.fieldErrors);
        toast.error(`Unable to save ${title}`, { description: normalized.formError });
      } finally {
        setSaving(false);
      }
    },
    [editingId, endpoint, fields, formState, refreshItems, resetForm, title],
  );

  const handleDelete = useCallback(
    async (id) => {
      setError('');
      setFieldErrors({});
      setDeletingId(id);

      try {
        await handleRequest(() =>
          fetch(endpoint, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id }),
          }),
        );
        await refreshItems();
        await revalidatePublicData();
        notifyRealtimeUpdate();
        toast.success(`${title} entry deleted.`);

        if (editingId === id) {
          resetForm();
        }
      } catch (requestError) {
        const normalized = normalizeFormError(requestError, `Unable to delete ${title}`);
        setError(normalized.formError);
        setFieldErrors(normalized.fieldErrors);
        toast.error(`Unable to delete ${title}`, { description: normalized.formError });
      } finally {
        setDeletingId(null);
      }
    },
    [editingId, endpoint, refreshItems, resetForm, title],
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
    fieldErrors,
    setFormState,
    loadItems,
    setDialogOpen,
    openCreate,
    openEdit,
    resetForm,
    handleSubmit,
    handleDelete,
    clearFieldError: (key) => {
      setFieldErrors((previous) => clearFieldErrors(previous, key));
      setError((previous) => {
        if (!key) {
          return previous;
        }
        return previous;
      });
    },
  };
}

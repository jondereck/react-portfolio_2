'use client';

import { useCallback, useEffect, useState } from 'react';

const toast = {
  success: () => {},
  error: () => {},
  message: () => {},
};

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

    if (rawValue === '' && field.required === false) {
      payload[field.name] = undefined;
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

export function useAdminData({ endpoint, title, fields, adminKey }) {
  const [items, setItems] = useState([]);
  const [formState, setFormState] = useState(() => defaultFormState(fields));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load data');

      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(`Unable to load ${title}`, {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [endpoint, title]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormState(defaultFormState(fields));
  }, [fields]);

  const handleEdit = useCallback(
    (item) => {
      setEditingId(item.id);
      setFormState(formatForForm(fields, item));
      toast.message(`Editing ${title.toLowerCase()} #${item.id}`);
    },
    [fields, title]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!adminKey) {
        toast.error('Provide the admin API key to save changes.');
        return;
      }

      setSaving(true);
      try {
        const payload = buildPayload(fields, formState);
        const isUpdating = editingId !== null;

        const response = await fetch(endpoint, {
          method: isUpdating ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify(isUpdating ? { ...payload, id: editingId } : payload),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail?.error || 'Request failed');
        }

        toast.success(`${title} ${isUpdating ? 'updated' : 'created'}.`);
        await loadItems();
        resetForm();
      } catch (error) {
        toast.error(`Unable to save ${title}`, {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setSaving(false);
      }
    },
    [adminKey, editingId, endpoint, fields, formState, loadItems, resetForm, title]
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!adminKey) {
        toast.error('Provide the admin API key to delete entries.');
        return;
      }

      setDeletingId(id);
      try {
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail?.error || 'Delete failed');
        }

        toast.success(`${title} entry deleted.`);
        await loadItems();

        if (editingId === id) {
          resetForm();
        }
      } catch (error) {
        toast.error(`Unable to delete ${title}`, {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setDeletingId(null);
      }
    },
    [adminKey, editingId, endpoint, loadItems, resetForm, title]
  );

  return {
    items,
    loading,
    saving,
    deletingId,
    editingId,
    formState,
    setFormState,
    loadItems,
    resetForm,
    handleEdit,
    handleSubmit,
    handleDelete,
  };
}

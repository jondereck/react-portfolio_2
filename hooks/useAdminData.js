'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const createDefaultFormState = (fields) =>
  fields.reduce((state, field) => {
    state[field.name] = field.type === 'checkbox' ? false : '';
    return state;
  }, {});

const buildPayload = (fields, formState) => {
  const payload = {};

  fields.forEach((field) => {
    const rawValue = formState[field.name];

    if (field.serialize) {
      payload[field.name] = field.serialize(rawValue);
      return;
    }

    if (field.type === 'number') {
      payload[field.name] = rawValue === '' ? undefined : Number(rawValue);
      return;
    }

    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(rawValue);
      return;
    }

    payload[field.name] = rawValue === '' ? null : rawValue;
  });

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
  }, createDefaultFormState(fields));

export function useAdminData(resource, adminKey) {
  const { endpoint, fields, title } = resource;
  const defaultFormState = useMemo(() => createDefaultFormState(fields), [fields]);

  const [items, setItems] = useState([]);
  const [formState, setFormState] = useState(defaultFormState);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(endpoint, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('Failed to load data');
      }

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
    setFormState(defaultFormState);
  }, [defaultFormState]);

  const editItem = useCallback(
    (item) => {
      setEditingId(item.id);
      setFormState(formatForForm(fields, item));
      toast.message(`Editing ${title.toLowerCase()} #${item.id}`);
    },
    [fields, title],
  );

  const saveItem = useCallback(
    async (event) => {
      event.preventDefault();

      if (!adminKey) {
        toast.error('Provide the admin API key to save changes.');
        return;
      }

      setSaving(true);

      try {
        const payload = buildPayload(fields, formState);
        const method = editingId ? 'PUT' : 'POST';
        const body = editingId ? { ...payload, id: editingId } : payload;

        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail?.error || 'Request failed');
        }

        toast.success(`${title} ${editingId ? 'updated' : 'created'}.`);
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
    [adminKey, editingId, endpoint, fields, formState, loadItems, resetForm, title],
  );

  const deleteItem = useCallback(
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
    [adminKey, editingId, endpoint, loadItems, resetForm, title],
  );

  return {
    items,
    formState,
    setFormState,
    editingId,
    loading,
    saving,
    deletingId,
    loadItems,
    saveItem,
    deleteItem,
    editItem,
    resetForm,
  };
}

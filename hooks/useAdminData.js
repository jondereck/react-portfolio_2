'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

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

export function useAdminData({ endpoint, title, fields, adminKey }) {
  const [items, setItems] = useState([]);
  const [formState, setFormState] = useState(() => defaultFormState(fields));
  const [editingId, setEditingId] = useState(null);
  const [dialogMode, setDialogMode] = useState('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: adminKey ? { 'x-admin-key': adminKey } : undefined,
      });
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
  }, [adminKey, endpoint, title]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setDialogMode('create');
    setFormState(defaultFormState(fields));
  }, [fields]);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    resetForm();
  }, [resetForm]);

  const openCreate = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const openEdit = useCallback(
    async (id) => {
      setSaving(true);
      try {
        const response = await fetch(`${endpoint}/${id}`, {
          cache: 'no-store',
          headers: adminKey ? { 'x-admin-key': adminKey } : undefined,
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail?.error || 'Failed to load entry');
        }

        const item = await response.json();
        setEditingId(id);
        setDialogMode('edit');
        setFormState(formatForForm(fields, item));
        setDialogOpen(true);
      } catch (error) {
        toast.error(`Unable to load ${title} entry`, {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setSaving(false);
      }
    },
    [adminKey, endpoint, fields, title]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      setSaving(true);
      try {
        const payload = buildPayload(fields, formState);
        const isUpdating = dialogMode === 'edit' && editingId !== null;
        const requestUrl = isUpdating ? `${endpoint}/${editingId}` : endpoint;

        const response = await fetch(requestUrl, {
          method: isUpdating ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminKey ? { 'x-admin-key': adminKey } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail?.error || 'Request failed');
        }

        toast.success(`${title} ${isUpdating ? 'updated' : 'created'}.`);
        await loadItems();
        closeDialog();
      } catch (error) {
        toast.error(`Unable to save ${title}`, {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setSaving(false);
      }
    },
    [adminKey, closeDialog, dialogMode, editingId, endpoint, fields, formState, loadItems, title]
  );

  const handleDelete = useCallback(
    async (id) => {
      setDeletingId(id);
      try {
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(adminKey ? { 'x-admin-key': adminKey } : {}),
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
          closeDialog();
        }
      } catch (error) {
        toast.error(`Unable to delete ${title}`, {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setDeletingId(null);
      }
    },
    [adminKey, closeDialog, editingId, endpoint, loadItems, title]
  );

  return {
    items,
    loading,
    saving,
    deletingId,
    editingId,
    dialogMode,
    dialogOpen,
    formState,
    setFormState,
    loadItems,
    openCreate,
    openEdit,
    closeDialog,
    handleSubmit,
    handleDelete,
  };
}

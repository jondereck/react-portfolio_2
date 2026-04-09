'use client';

import { useCallback, useEffect, useState } from 'react';

const resources = [
  {
    key: 'certificates',
    title: 'Certificates',
    endpoint: '/api/certificates',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'issuer', label: 'Issuer', type: 'text' },
      { name: 'image', label: 'Image URL', type: 'url' },
      { name: 'link', label: 'Reference Link', type: 'url' },
      { name: 'category', label: 'Category', type: 'text' },
    ],
  },
  {
    key: 'skills',
    title: 'Skills',
    endpoint: '/api/skills',
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'level', label: 'Level (1-100)', type: 'number', placeholder: '50' },
      { name: 'category', label: 'Category', type: 'text' },
    ],
  },
  {
    key: 'experience',
    title: 'Experience',
    endpoint: '/api/experience',
    fields: [
      { name: 'title', label: 'Role Title', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        serialize: (value) => (value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null),
        deserialize: (value) => (value ? value.substring(0, 10) : ''),
      },
      {
        name: 'endDate',
        label: 'End Date (leave blank for ongoing)',
        type: 'date',
        serialize: (value) => (value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null),
        deserialize: (value) => (value ? value.substring(0, 10) : ''),
      },
    ],
  },
];

const defaultFormState = (fields) =>
  fields.reduce((state, field) => {
    state[field.name] = '';
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
      payload[field.name] = rawValue === '' ? null : Number(rawValue);
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

    state[field.name] = value ?? '';
    return state;
  }, defaultFormState(fields));

function AdminSection({ resource, adminKey }) {
  const { endpoint, fields, title } = resource;
  const [items, setItems] = useState([]);
  const [formState, setFormState] = useState(() => defaultFormState(fields));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load data');
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load data');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setEditingId(null);
    setFormState(defaultFormState(fields));
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!adminKey) {
      setError('Provide the admin API key to create or update entries.');
      return;
    }

    setError('');
    setMessage('');

    const payload = buildPayload(fields, formState);
    const method = editingId ? 'PUT' : 'POST';
    const body = editingId ? { ...payload, id: editingId } : payload;

    try {
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

      await loadItems();
      setMessage(editingId ? 'Entry updated.' : 'Entry created.');
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormState(formatForForm(fields, item));
    setMessage(`Editing #${item.id}`);
  };

  const handleDelete = async (id) => {
    if (!adminKey) {
      setError('Provide the admin API key to delete entries.');
      return;
    }

    if (!confirm(`Delete ${title.toLowerCase()} entry #${id}?`)) return;

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

      setMessage('Entry deleted.');
      await loadItems();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
        <button type="button" className="text-sm text-blue-600 underline" onClick={loadItems} disabled={loading}>
          Refresh
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const commonProps = {
            id: `${resource.key}-${field.name}`,
            name: field.name,
            value: formState[field.name] ?? '',
            onChange: (event) => setFormState((prev) => ({ ...prev, [field.name]: event.target.value })),
            className:
              'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
            required: field.name !== 'endDate',
            placeholder: field.placeholder,
          };

          return (
            <label key={field.name} className="flex flex-col text-sm font-medium text-slate-700 dark:text-slate-200">
              {field.label}
              {field.type === 'textarea' ? (
                <textarea {...commonProps} rows={field.rows || 3} />
              ) : (
                <input type={field.type} {...commonProps} />
              )}
            </label>
          );
        })}
        <div className="md:col-span-2 flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            {editingId ? 'Update Entry' : 'Create Entry'}
          </button>
          {editingId && (
            <button type="button" className="text-sm text-slate-600 underline dark:text-slate-300" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-slate-500">Loading data…</p>}
        {!loading && items.length === 0 && <p className="text-sm text-slate-500">No entries yet.</p>}
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-slate-200 p-4 text-sm shadow-sm dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">#{item.id}</div>
              <div className="flex gap-2 text-xs">
                <button className="text-blue-600" type="button" onClick={() => handleEdit(item)}>
                  Edit
                </button>
                <button className="text-rose-600" type="button" onClick={() => handleDelete(item.id)}>
                  Delete
                </button>
              </div>
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
              {JSON.stringify(item, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Admin Console</p>
            <h1 className="text-3xl font-bold">Portfolio CMS</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage certificates, skills, and experience in one place. Provide the admin API key to unlock write actions.
            </p>
          </div>
          <label className="flex flex-col text-sm font-medium text-slate-700 dark:text-slate-200">
            Admin API Key
            <input
              type="password"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Enter the value of ADMIN_API_KEY"
            />
          </label>
        </header>

        <div className="space-y-6">
          {resources.map((resource) => (
            <AdminSection key={resource.key} resource={resource} adminKey={adminKey} />
          ))}
        </div>
      </div>
    </div>
  );
}

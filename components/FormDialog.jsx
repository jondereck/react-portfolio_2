'use client';

import { useState } from 'react';

function FieldInput({ resourceKey, field, value, onChange, adminKey }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!adminKey) {
      setUploadError('Admin key is required before uploading.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploadError('');
    setUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setUploadError(typeof payload?.error === 'string' ? payload.error : 'Image upload failed.');
        return;
      }

      const payload = await response.json();
      if (typeof payload?.secure_url === 'string' && payload.secure_url.length > 0) {
        onChange(payload.secure_url);
      } else {
        setUploadError('Image upload failed.');
      }
    } catch {
      setUploadError('Image upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (field.type === 'checkbox') {
    return (
      <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{field.label}</span>
        <input id={`${resourceKey}-${field.name}`} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
      </div>
    );
  }

  const className = 'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
  const colSpan = field.type === 'textarea' ? 'md:col-span-2' : '';

  return (
    <label className={`flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 ${colSpan}`}>
      {field.label}
      {field.type === 'textarea' ? (
        <textarea
          id={`${resourceKey}-${field.name}`}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          required={field.required !== false}
          rows={field.rows || 3}
          className={`rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950`}
        />
      ) : field.type === 'url' && field.name.toLowerCase().includes('image') ? (
        <div className="space-y-2">
          <input id={`${resourceKey}-${field.name}`} type="url" value={value ?? ''} readOnly className={className} />
          <input id={`${resourceKey}-${field.name}-file`} type="file" accept="image/*" onChange={handleFileUpload} className={className} />
          {uploading ? <p className="text-xs text-slate-500">Uploading image…</p> : null}
          {uploadError ? <p className="text-xs text-rose-600">{uploadError}</p> : null}
        </div>
      ) : (
        <input
          id={`${resourceKey}-${field.name}`}
          type={field.type}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          required={field.required !== false}
          className={className}
        />
      )}
    </label>
  );
}

export default function FormDialog({ title, resourceKey, fields, formState, editingId, saving, open, onOpenChange, onChange, onSubmit, onReset, adminKey }) {
  const isEditing = editingId !== null;

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 dark:bg-slate-900">
            <h3 className="text-lg font-semibold">{isEditing ? `Edit ${title}` : `Create ${title}`}</h3>
            <p className="mt-1 text-sm text-slate-500">Update fields and save to publish changes in the admin API.</p>
            <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <FieldInput
                  key={field.name}
                  resourceKey={resourceKey}
                  field={field}
                  value={formState[field.name]}
                  adminKey={adminKey}
                  onChange={(value) => onChange(field.name, value)}
                />
              ))}
              <div className="md:col-span-2 mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="h-9 rounded-md px-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    onReset();
                    onOpenChange(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                >
                  {saving ? 'Saving…' : isEditing ? 'Update Entry' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

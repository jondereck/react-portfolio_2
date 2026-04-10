'use client';

import { useState } from 'react';
import { CldUploadWidget } from 'next-cloudinary';

type UploadResult = {
  info?: {
    secure_url?: string;
  };
};

type ImageUploadProps = {
  id: string;
  label: string;
  value: string;
  adminKey?: string;
  onChange: (url: string) => void;
  className?: string;
};

const inputStyles = 'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';

export default function ImageUpload({ id, label, value, adminKey, onChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!adminKey) {
      setUploadError('Provide admin API key before uploading.');
      return null;
    }

    setUploadError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
        },
        body: formData,
      });

      const payload: { secure_url?: string; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok) {
        setUploadError(typeof payload.error === 'string' ? payload.error : 'Image upload failed');
        return null;
      }

      return typeof payload.secure_url === 'string' && payload.secure_url.length > 0 ? payload.secure_url : null;
    } catch {
      setUploadError('Image upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className={`flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 ${className ?? ''}`}>
      {label}
      <input id={`${id}-url`} type="url" value={value} readOnly className={inputStyles} />
      <CldUploadWidget
        uploadHandler={uploadFile}
        onSuccess={(result: UploadResult) => {
          const uploadedUrl = result.info?.secure_url;
          if (typeof uploadedUrl === 'string' && uploadedUrl.length > 0) {
            onChange(uploadedUrl);
          } else {
            setUploadError('Image upload failed');
          }
        }}
        onError={() => setUploadError('Image upload failed')}
      >
        {({ open }) => (
          <button type="button" onClick={open} disabled={uploading} className={`${inputStyles} text-left`}>
            {uploading ? 'Uploading image…' : 'Choose image'}
          </button>
        )}
      </CldUploadWidget>
      {uploadError ? <span className="text-xs text-red-600">{uploadError}</span> : null}
    </label>
  );
}

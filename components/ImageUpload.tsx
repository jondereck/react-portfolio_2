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
  onChange: (url: string) => void;
  className?: string;
};
const buttonStyles = 'h-10 rounded-md border border-slate-300 bg-white px-3 text-left text-sm dark:border-slate-700 dark:bg-slate-950';

export default function ImageUpload({ id, label, value, onChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  return (
    <label className={`flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 ${className ?? ''}`}>
      {label}
      {value ? <img src={value} alt="preview" className="h-40 w-full rounded object-cover" /> : null}
      <CldUploadWidget
        uploadPreset={uploadPreset ?? ''}
        options={{
          cropping: true,
          croppingAspectRatio: 1,
          croppingShowDimensions: true,
          multiple: false,
        }}
        onSuccess={(result: UploadResult) => {
          setUploading(false);
          const uploadedUrl = result.info?.secure_url;
          if (typeof uploadedUrl === 'string' && uploadedUrl.length > 0) {
            onChange(uploadedUrl);
          } else {
            setUploadError('Image upload failed');
          }
        }}
        onError={() => {
          setUploading(false);
          setUploadError('Image upload failed');
        }}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => {
              if (!uploadPreset) {
                setUploadError('Missing NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
                return;
              }
              if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
                setUploadError('Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.');
                return;
              }
              setUploadError('');
              setUploading(true);
              open();
            }}
            disabled={uploading}
            className={buttonStyles}
          >
            {uploading ? 'Uploading image…' : 'Upload Image'}
          </button>
        )}
      </CldUploadWidget>
      {uploadError ? <span className="text-xs text-red-600">{uploadError}</span> : null}
    </label>
  );
}

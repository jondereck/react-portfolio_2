'use client';

import { useRef, useState } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import { toast } from 'sonner';

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
  const [uploadError, setUploadError] = useState('');
  const uploadToastIdRef = useRef<string | number | null>(null);
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const dismissUploadToast = () => {
    if (uploadToastIdRef.current !== null) {
      toast.dismiss(uploadToastIdRef.current);
      uploadToastIdRef.current = null;
    }
  };

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
          dismissUploadToast();
          const uploadedUrl = result.info?.secure_url;
          if (typeof uploadedUrl === 'string' && uploadedUrl.length > 0) {
            onChange(uploadedUrl);
          } else {
            setUploadError('Image upload failed');
            toast.error('Image upload failed');
          }
        }}
        onError={() => {
          dismissUploadToast();
          setUploadError('Image upload failed');
          toast.error('Image upload failed');
        }}
        onClose={dismissUploadToast}
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
              dismissUploadToast();
              uploadToastIdRef.current = toast.loading('Uploading image...');
              open();
            }}
            className={buttonStyles}
          >
            Upload Image
          </button>
        )}
      </CldUploadWidget>
      {uploadError ? <span className="text-xs text-red-600">{uploadError}</span> : null}
    </label>
  );
}

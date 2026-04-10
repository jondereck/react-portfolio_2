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
  id?: string;
  label?: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
};
const dropzoneBaseStyles =
  'group flex min-h-32 cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm transition dark:border-slate-700 dark:bg-slate-950';

export default function ImageUpload({ id = 'image-upload', label = 'Image', value, onChange, className }: ImageUploadProps) {
  const [uploadError, setUploadError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const uploadToastIdRef = useRef<string | number | null>(null);
  const isUploadingRef = useRef(false);
  const openWidgetRef = useRef<(() => void) | null>(null);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const previewUrl = typeof value === 'string' ? value.trim() : '';

  const dismissUploadToast = () => {
    if (uploadToastIdRef.current !== null) {
      toast.dismiss(uploadToastIdRef.current);
      uploadToastIdRef.current = null;
    }
  };

  const startUploadToast = () => {
    if (isUploadingRef.current) {
      return;
    }
    dismissUploadToast();
    uploadToastIdRef.current = toast.loading('Uploading image...');
    isUploadingRef.current = true;
  };

  const finishUploadToast = () => {
    dismissUploadToast();
    isUploadingRef.current = false;
  };

  const openWidget = () => {
    if (!uploadPreset) {
      setUploadError('Missing NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
      return;
    }
    if (!cloudName) {
      setUploadError('Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.');
      return;
    }
    setUploadError('');
    openWidgetRef.current?.();
  };

  const widgetProps: any = {
    uploadPreset: uploadPreset ?? '',
    options: {
      cropping: true,
      croppingAspectRatio: 1,
      croppingShowDimensions: true,
      multiple: false,
    },
    onEvent: (event: string) => {
      if (event === 'queues-start') {
        startUploadToast();
      }
    },
    onSuccess: (result: UploadResult) => {
      finishUploadToast();
      const uploadedUrl = result.info?.secure_url;
      if (typeof uploadedUrl === 'string' && uploadedUrl.length > 0) {
        setUploadError('');
        onChange(uploadedUrl);
        toast.success('Image uploaded');
      } else {
        setUploadError('Image upload failed');
        toast.error('Image upload failed');
      }
    },
    onError: () => {
      finishUploadToast();
      setUploadError('Image upload failed');
      toast.error('Image upload failed');
    },
    onClose: finishUploadToast,
  };

  return (
    <label htmlFor={id} className={`flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 ${className ?? ''}`}>
      {label}
      <CldUploadWidget {...widgetProps}>
        {({ open }) => (
          <>
            {previewUrl ? (
              <div
                id={id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  openWidgetRef.current = open;
                  openWidget();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openWidgetRef.current = open;
                    openWidget();
                  }
                }}
                className="overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-900"
              >
                <div className="flex min-h-[180px] max-h-[320px] items-center justify-center p-2">
                  <img src={previewUrl} alt={`${label} preview`} className="max-h-[300px] max-w-full object-contain" />
                </div>
              </div>
            ) : (
              <div
                id={id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  openWidgetRef.current = open;
                  openWidget();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openWidgetRef.current = open;
                    openWidget();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsDragActive(false);
                  openWidgetRef.current = open;
                  openWidget();
                }}
                className={`${dropzoneBaseStyles} ${isDragActive ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-900' : ''}`}
              >
                <div className="space-y-1">
                  <p className="font-medium text-slate-700 dark:text-slate-200">Click or drag and drop to upload</p>
                  <p className="text-xs text-slate-500">Single image only</p>
                </div>
              </div>
            )}
            {previewUrl ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  openWidgetRef.current = open;
                  openWidget();
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openWidgetRef.current = open;
                    openWidget();
                  }
                }}
                className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-center text-xs text-slate-500 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
              >
                Click to replace image
              </div>
            ) : null}
          </>
        )}
      </CldUploadWidget>
      {uploadError ? <span className="text-xs text-red-600">{uploadError}</span> : null}
    </label>
  );
}

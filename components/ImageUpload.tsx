'use client';

import { CldUploadWidget } from 'next-cloudinary';

type UploadResult = {
  info?: {
    secure_url?: string;
  };
};

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
};

export default function ImageUpload({ value, onChange, label, className }: ImageUploadProps) {
  const isUploadResult = (result: unknown): result is UploadResult => {
    if (!result || typeof result !== 'object' || !('info' in result)) return false;
    const info = result.info;
    if (typeof info === 'undefined') return true;
    if (!info || typeof info !== 'object') return false;
    if (!('secure_url' in info)) return true;
    return typeof info.secure_url === 'string' || typeof info.secure_url === 'undefined';
  };

  const getImageUrl = (result: unknown): string => {
    if (!isUploadResult(result)) return '';
    const info = result.info;
    if (!info || typeof info !== 'object') return '';
    return typeof info.secure_url === 'string' ? info.secure_url : '';
  };

  return (
    <div className={className ?? 'space-y-2'}>
      {label ? <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p> : null}
      <input
        type="url"
        value={value}
        readOnly
        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
      />
      <CldUploadWidget
        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
        onSuccess={(result) => {
          const imageUrl = getImageUrl(result);
          if (imageUrl.length > 0) {
            onChange(imageUrl);
          }
        }}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
          >
            Upload Image
          </button>
        )}
      </CldUploadWidget>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';

type WidgetResults = {
  info?: {
    secure_url?: string;
  };
};

type WidgetProps = {
  children: (helpers: { open: () => void }) => ReactNode;
  onSuccess?: (result: WidgetResults) => void;
  onError?: (error: Error) => void;
  uploadPreset?: string;
  options?: {
    cropping?: boolean;
    croppingAspectRatio?: number;
    croppingShowDimensions?: boolean;
    multiple?: boolean;
  };
};

export function CldUploadWidget({ children, onSuccess, onError, uploadPreset, options }: WidgetProps) {
  const open = () => {
    if (typeof document === 'undefined') {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = options?.multiple === true;
    input.onchange = async () => {
      const file = input.files?.[0];
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

      if (!file || !cloudName || !uploadPreset) {
        onError?.(new Error('Image upload failed'));
        return;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          onError?.(new Error('Image upload failed'));
          return;
        }

        const payload = (await response.json()) as WidgetResults['info'] | null;
        const secureUrl = payload?.secure_url;
        if (typeof secureUrl === 'string' && secureUrl.length > 0) {
          onSuccess?.({ info: { secure_url: secureUrl } });
          return;
        }

        onError?.(new Error('Image upload failed'));
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Image upload failed'));
      }
    };

    input.click();
  };

  return <>{children({ open })}</>;
}

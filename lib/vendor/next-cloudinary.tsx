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
  uploadHandler?: (file: File) => Promise<string | null>;
};

export function CldUploadWidget({ children, onSuccess, onError, uploadHandler }: WidgetProps) {
  const open = () => {
    if (typeof document === 'undefined') {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !uploadHandler) {
        return;
      }

      try {
        const secureUrl = await uploadHandler(file);
        if (secureUrl) {
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

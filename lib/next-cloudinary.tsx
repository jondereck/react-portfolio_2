'use client';

import type { ReactNode } from 'react';

type OpenOptions = {
  resourceType?: string;
};

type UploadWidgetChildren = (args: { open: (options?: OpenOptions) => void }) => ReactNode;

type CldUploadWidgetProps = {
  children: UploadWidgetChildren;
  onSuccess?: (result: unknown) => void;
  uploadPreset?: string;
};

export function CldUploadWidget({ children, onSuccess }: CldUploadWidgetProps) {
  const open = async () => {
    const url = window.prompt('Enter uploaded image URL');
    if (!url) return;
    onSuccess?.({ info: { secure_url: url } });
  };

  return <>{children({ open })}</>;
}

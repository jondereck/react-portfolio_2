'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';

type WidgetResults = {
  info?: {
    secure_url?: string;
  };
};

type WidgetProps = {
  children: (helpers: { open: () => void }) => ReactNode;
  onSuccess?: (result: WidgetResults) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  onEvent?: (event: string) => void;
  uploadPreset?: string;
  options?: {
    cropping?: boolean;
    croppingAspectRatio?: number;
    croppingShowDimensions?: boolean;
    multiple?: boolean;
  };
};

type CloudinaryWidgetError = {
  message?: string;
};

type CloudinaryWidgetEvent = 'success' | 'error' | 'close' | string;

type CloudinaryWidget = {
  open: () => void;
};

type CloudinaryGlobal = {
  createUploadWidget: (
    config: {
      cloudName?: string;
      uploadPreset?: string;
      cropping?: boolean;
      croppingAspectRatio?: number;
      croppingShowDimensions?: boolean;
      multiple?: boolean;
    },
    callback: (error: CloudinaryWidgetError | null, result: { event: CloudinaryWidgetEvent; info?: WidgetResults['info'] }) => void,
  ) => CloudinaryWidget;
};

declare global {
  interface Window {
    cloudinary?: CloudinaryGlobal;
  }
}

const CLOUDINARY_WIDGET_SCRIPT_ID = 'cloudinary-upload-widget-script';
const CLOUDINARY_WIDGET_SCRIPT_SRC = 'https://upload-widget.cloudinary.com/global/all.js';

const loadCloudinaryScript = async (): Promise<CloudinaryGlobal> => {
  if (typeof window === 'undefined') {
    throw new Error('Image upload unavailable');
  }

  if (window.cloudinary) {
    return window.cloudinary;
  }

  const existingScript = document.getElementById(CLOUDINARY_WIDGET_SCRIPT_ID) as HTMLScriptElement | null;

  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Image upload unavailable')), { once: true });
    });
  } else {
    const script = document.createElement('script');
    script.id = CLOUDINARY_WIDGET_SCRIPT_ID;
    script.src = CLOUDINARY_WIDGET_SCRIPT_SRC;
    script.async = true;
    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Image upload unavailable'));
      document.body.appendChild(script);
    });
  }

  if (!window.cloudinary) {
    throw new Error('Image upload unavailable');
  }

  return window.cloudinary;
};

export function CldUploadWidget({ children, onSuccess, onError, onClose, onEvent, uploadPreset, options }: WidgetProps) {
  const open = useCallback(async () => {
    try {
      const cloudinary = await loadCloudinaryScript();
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName || !uploadPreset) {
        onError?.(new Error('Image upload failed'));
        return;
      }

      const widget = cloudinary.createUploadWidget(
        {
          cloudName,
          uploadPreset,
          cropping: options?.cropping,
          croppingAspectRatio: options?.croppingAspectRatio,
          croppingShowDimensions: options?.croppingShowDimensions,
          multiple: options?.multiple,
        },
        (error, result) => {
          if (error) {
            onError?.(new Error(error.message || 'Image upload failed'));
            return;
          }

          onEvent?.(String(result.event));

          if (result.event === 'success') {
            onSuccess?.({ info: result.info });
            return;
          }

          if (result.event === 'close') {
            onClose?.();
          }
        },
      );

      widget.open();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Image upload failed'));
    }
  }, [onClose, onError, onEvent, onSuccess, options?.cropping, options?.croppingAspectRatio, options?.croppingShowDimensions, options?.multiple, uploadPreset]);

  return <>{children({ open })}</>;
}

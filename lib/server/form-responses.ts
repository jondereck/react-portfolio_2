import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatZodFieldErrors } from '@/lib/server/request-parsing';

export type FormFieldErrors = Record<string, string[]>;

type FormErrorPayload = {
  error: string;
  errorCode?: string;
  fieldErrors?: FormFieldErrors;
  details?: Record<string, unknown>;
};

function firstFieldError(fieldErrors?: FormFieldErrors) {
  if (!fieldErrors) {
    return '';
  }

  for (const messages of Object.values(fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      return messages[0];
    }
  }

  return '';
}

export function mergeFieldErrors(...maps: Array<FormFieldErrors | undefined | null>) {
  return maps.reduce<FormFieldErrors>((accumulator, current) => {
    if (!current) {
      return accumulator;
    }

    for (const [key, messages] of Object.entries(current)) {
      if (!accumulator[key]) {
        accumulator[key] = [];
      }

      for (const message of messages) {
        if (!accumulator[key].includes(message)) {
          accumulator[key].push(message);
        }
      }
    }

    return accumulator;
  }, {});
}

export function createFormErrorResponse(payload: FormErrorPayload, status = 400) {
  return NextResponse.json(
    {
      error: payload.error,
      errorCode: payload.errorCode,
      fieldErrors: payload.fieldErrors,
      details: payload.details ?? payload.fieldErrors,
    },
    { status },
  );
}

export function createFieldErrorResponse(options: {
  field: string;
  message: string;
  errorCode?: string;
  status?: number;
}) {
  const fieldErrors = {
    [options.field]: [options.message],
  };

  return createFormErrorResponse(
    {
      error: options.message,
      errorCode: options.errorCode,
      fieldErrors,
    },
    options.status ?? 400,
  );
}

export function createZodFormErrorResponse(
  error: z.ZodError,
  options?: {
    prefix?: string;
    error?: string;
    errorCode?: string;
    status?: number;
  },
) {
  const fieldErrors = formatZodFieldErrors(error, options?.prefix);
  return createFormErrorResponse(
    {
      error: firstFieldError(fieldErrors) || options?.error || 'Validation failed.',
      errorCode: options?.errorCode ?? 'INVALID_PAYLOAD',
      fieldErrors,
    },
    options?.status ?? 400,
  );
}

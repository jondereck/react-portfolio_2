import { z } from 'zod';
import { isFile, RequestValidationError } from '@/lib/server/uploads';

type ParsedRequestData = {
  data: Record<string, unknown>;
  imageFile?: File;
  contentType: 'json' | 'multipart';
};

const coerceFormValue = (value: string) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === '') return undefined;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  return value;
};

export async function parseMultipartOrJson(request: Request): Promise<ParsedRequestData> {
  const rawContentType = request.headers.get('content-type') ?? '';

  if (rawContentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const data: Record<string, unknown> = {};
    let imageFile: File | undefined;

    for (const [key, value] of formData.entries()) {
      if (key === 'imageFile') {
        if (isFile(value) && value.size > 0) {
          imageFile = value;
        }
        continue;
      }

      if (isFile(value)) {
        if (value.size > 0) {
          throw new RequestValidationError(`Unexpected file field "${key}".`, 400, undefined, 'UNEXPECTED_FILE_FIELD');
        }
        continue;
      }

      data[key] = coerceFormValue(value);
    }

    return { data, imageFile, contentType: 'multipart' };
  }

  if (rawContentType.includes('application/json') || rawContentType === '') {
    const payload = await request.json().catch(() => {
      throw new RequestValidationError('Malformed JSON request body.', 400, undefined, 'MALFORMED_JSON');
    });

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new RequestValidationError('Request body must be a JSON object.', 400, undefined, 'INVALID_PAYLOAD');
    }

    return { data: payload as Record<string, unknown>, contentType: 'json' };
  }

  throw new RequestValidationError(
    'Unsupported Content-Type. Use application/json or multipart/form-data.',
    415,
    undefined,
    'UNSUPPORTED_CONTENT_TYPE',
  );
}

export function toFieldErrorKey(path: (string | number)[]) {
  if (path.length === 0) {
    return '';
  }

  return path.reduce((key, segment) => {
    if (typeof segment === 'number') {
      return `${key}[${segment}]`;
    }

    if (!key) {
      return segment;
    }

    return `${key}.${segment}`;
  }, '');
}

export function prefixFieldErrors(fieldErrors: Record<string, string[]>, prefix?: string) {
  if (!prefix) {
    return fieldErrors;
  }

  return Object.entries(fieldErrors).reduce<Record<string, string[]>>((accumulator, [key, messages]) => {
    const nextKey = key ? `${prefix}.${key}` : prefix;
    accumulator[nextKey] = messages;
    return accumulator;
  }, {});
}

export function formatZodFieldErrors(error: z.ZodError, prefix?: string) {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((accumulator, issue) => {
    const key = toFieldErrorKey(issue.path);
    const nextKey = prefix ? (key ? `${prefix}.${key}` : prefix) : key || '_form';

    if (!accumulator[nextKey]) {
      accumulator[nextKey] = [];
    }

    if (!accumulator[nextKey].includes(issue.message)) {
      accumulator[nextKey].push(issue.message);
    }

    return accumulator;
  }, {});

  return fieldErrors;
}

export function formatZodError(error: z.ZodError) {
  return formatZodFieldErrors(error);
}

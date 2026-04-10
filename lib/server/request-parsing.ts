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
          throw new RequestValidationError(`Unexpected file field "${key}".`, 400);
        }
        continue;
      }

      data[key] = coerceFormValue(value);
    }

    return { data, imageFile, contentType: 'multipart' };
  }

  if (rawContentType.includes('application/json') || rawContentType === '') {
    const payload = await request.json().catch(() => {
      throw new RequestValidationError('Malformed JSON request body.', 400);
    });

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new RequestValidationError('Request body must be a JSON object.', 400);
    }

    return { data: payload as Record<string, unknown>, contentType: 'json' };
  }

  throw new RequestValidationError(
    'Unsupported Content-Type. Use application/json or multipart/form-data.',
    415,
  );
}

export function formatZodError(error: z.ZodError) {
  return error.flatten().fieldErrors;
}

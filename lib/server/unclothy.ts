import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatZodFieldErrors } from '@/lib/server/request-parsing';
import { RequestValidationError } from '@/lib/server/uploads';

export type UnclothyEnvelope<T> = {
  success?: boolean;
  status_code?: number;
  status_text?: string;
  message?: string;
  result?: T;
};

const DEFAULT_SETTINGS_PATH = '/v2/task/settings';

const HTTP_STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

function statusTextForStatus(status: number, fallback?: string) {
  const normalized = Number.isInteger(status) ? status : 500;
  return (fallback && fallback.trim()) || HTTP_STATUS_TEXT[normalized] || 'Error';
}

function normalizeHttpStatus(value: unknown, fallback = 500) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : fallback;
}

function requireEnv(name: string) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function isUnclothyConfigured() {
  return Boolean(requireEnv('UNCLOTHY_API_KEY')) && Boolean(requireEnv('UNCLOTHY_API_BASE_URL'));
}

function buildUrl(path: string) {
  const base = requireEnv('UNCLOTHY_API_BASE_URL');
  if (!base) {
    throw new RequestValidationError(
      'Unclothy is not configured. Set UNCLOTHY_API_BASE_URL.',
      503,
      undefined,
      'UNCLOTHY_NOT_CONFIGURED',
    );
  }

  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getApiKey() {
  const apiKey = requireEnv('UNCLOTHY_API_KEY');
  if (!apiKey) {
    throw new RequestValidationError(
      'Unclothy is not configured. Set UNCLOTHY_API_KEY.',
      503,
      undefined,
      'UNCLOTHY_NOT_CONFIGURED',
    );
  }
  return apiKey;
}

function mapUnclothyErrorCode(status: number) {
  if (status === 401) return 'UNCLOTHY_UNAUTHORIZED';
  if (status === 403) return 'UNCLOTHY_FORBIDDEN';
  if (status === 404) return 'UNCLOTHY_NOT_FOUND';
  if (status === 413) return 'UNCLOTHY_PAYLOAD_TOO_LARGE';
  if (status === 429) return 'UNCLOTHY_RATE_LIMITED';
  if (status >= 500) return 'UNCLOTHY_SERVER_ERROR';
  return 'UNCLOTHY_REQUEST_FAILED';
}

export function createUnclothyEnvelope<T>({
  success,
  status,
  message,
  result,
  statusText,
}: {
  success: boolean;
  status: number;
  message: string;
  result?: T;
  statusText?: string;
}) {
  const normalizedStatus = normalizeHttpStatus(status);
  return {
    success,
    status_code: normalizedStatus,
    status_text: statusTextForStatus(normalizedStatus, statusText),
    message,
    ...(result === undefined ? {} : { result }),
  };
}

export function createUnclothySuccessResponse<T>(result: T, status = 200, message?: string) {
  return NextResponse.json(
    createUnclothyEnvelope({
      success: true,
      status,
      message: message || statusTextForStatus(status),
      result,
    }),
    { status },
  );
}

function providerEnvelopeFromMeta(meta?: Record<string, unknown>) {
  const providerPayload = meta?.providerPayload;
  return providerPayload && typeof providerPayload === 'object'
    ? (providerPayload as UnclothyEnvelope<unknown> & Record<string, unknown>)
    : null;
}

export function toUnclothyErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status: 401,
        message: 'Unauthorized',
      }),
      { status: 401 },
    );
  }

  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status: 403,
        message: 'Forbidden',
      }),
      { status: 403 },
    );
  }

  if (error instanceof RequestValidationError) {
    const providerPayload = providerEnvelopeFromMeta(error.meta);
    const status = normalizeHttpStatus(providerPayload?.status_code ?? error.meta?.providerStatus ?? error.status, error.status);
    const message =
      (typeof providerPayload?.message === 'string' && providerPayload.message.trim()) ||
      (typeof providerPayload?.status_text === 'string' && providerPayload.status_text.trim()) ||
      error.message ||
      fallbackMessage;

    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status,
        statusText: typeof providerPayload?.status_text === 'string' ? providerPayload.status_text : undefined,
        message,
      }),
      { status },
    );
  }

  if (error instanceof z.ZodError) {
    const fieldErrors = formatZodFieldErrors(error);
    const message = Object.values(fieldErrors)[0]?.[0] || 'Invalid request body.';
    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status: 400,
        message,
      }),
      { status: 400 },
    );
  }

  if (error instanceof Error && /body|payload|entity/i.test(error.message) && /large|too\s+big|too\s+large|exceeded/i.test(error.message)) {
    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status: 413,
        message: 'Request body is too large.',
      }),
      { status: 413 },
    );
  }

  console.error(error);
  return NextResponse.json(
    createUnclothyEnvelope({
      success: false,
      status: 500,
      message: fallbackMessage,
    }),
    { status: 500 },
  );
}

export async function unclothyFetchJson<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
) {
  const response = await fetch(buildUrl(path), {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: 'no-store',
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    throw new RequestValidationError(
      location
        ? `Unclothy request was redirected (${response.status}). Check UNCLOTHY_API_BASE_URL (it likely needs an /api prefix). Redirected to: ${location}`
        : `Unclothy request was redirected (${response.status}). Check UNCLOTHY_API_BASE_URL (it likely needs an /api prefix).`,
      502,
      undefined,
      'UNCLOTHY_REDIRECT',
      {
        providerStatus: response.status,
        location,
      },
    );
  }

  const payload = (await response.json().catch(() => ({}))) as UnclothyEnvelope<T> & Record<string, unknown>;

  if (!response.ok) {
    const message =
      (typeof payload?.message === 'string' && payload.message.trim()) ||
      (typeof payload?.status_text === 'string' && payload.status_text.trim()) ||
      `Unclothy request failed (${response.status}).`;
    throw new RequestValidationError(message, response.status, undefined, mapUnclothyErrorCode(response.status), {
      providerStatus: response.status,
      providerPayload: payload,
    });
  }

  if (payload?.success === false) {
    const providerStatus = normalizeHttpStatus(payload.status_code, response.status >= 400 ? response.status : 502);
    const message =
      (typeof payload?.message === 'string' && payload.message.trim()) ||
      (typeof payload?.status_text === 'string' && payload.status_text.trim()) ||
      `Unclothy request failed (${providerStatus}).`;
    throw new RequestValidationError(message, providerStatus, undefined, mapUnclothyErrorCode(providerStatus), {
      providerStatus,
      providerPayload: payload,
    });
  }

  return payload;
}

export async function getUnclothyCredits() {
  const payload = await unclothyFetchJson<{ credits?: number }>('/v2/user/credits', { method: 'GET' });
  return Number(payload?.result?.credits ?? 0);
}

export async function getUnclothyTask(taskId: string) {
  if (!taskId || typeof taskId !== 'string') {
    throw new RequestValidationError('Invalid task id.', 400, undefined, 'INVALID_TASK_ID');
  }
  return unclothyFetchJson<Record<string, unknown>>(`/v2/task/${encodeURIComponent(taskId)}`, { method: 'GET' });
}

export async function createUnclothyTask(input: { base64: string; webhook_url?: string; settings: Record<string, unknown> }) {
  if (!input?.base64 || typeof input.base64 !== 'string') {
    throw new RequestValidationError('base64 image payload is required.', 400, { base64: ['Required.'] }, 'MISSING_IMAGE_BASE64');
  }
  return unclothyFetchJson<{ task_id?: string }>('/v2/task/create', { method: 'POST', body: input });
}

export async function getUnclothyTaskSettings() {
  const settingsPath = requireEnv('UNCLOTHY_SETTINGS_PATH') || DEFAULT_SETTINGS_PATH;
  const payload = await unclothyFetchJson<Record<string, unknown>>(settingsPath, { method: 'GET' });
  const result = payload?.result;
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const nested = (result as Record<string, unknown>).settings;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    return result as Record<string, unknown>;
  }
  return {};
}
